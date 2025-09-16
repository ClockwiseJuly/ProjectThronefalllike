import { _decorator, Component, sys } from 'cc';
import { GameState, GameStateType, GameMode } from './GameState';
const { ccclass } = _decorator;

/**
 * 存档类型枚举
 */
export enum SaveType {
    AUTO = 0,           // 自动存档
    MANUAL = 1,         // 手动存档
    QUICK = 2,          // 快速存档
    CLOUD = 3,          // 云存档
}

/**
 * 存档数据接口
 */
export interface ISaveData {
    version: string;        // 存档版本
    timestamp: number;      // 存档时间戳
    saveType: SaveType;    // 存档类型
    gameData: IGameData;   // 游戏数据
    playerData: IPlayerData; // 玩家数据
    settingsData: ISettingsData; // 设置数据
}

/**
 * 游戏数据接口
 */
export interface IGameData {
    currentState: GameStateType;
    gameMode: GameMode;
    dayCount: number;
    nightCount: number;
    score: number;
    playTime: number;
    level: number;
    experience: number;
}

/**
 * 玩家数据接口
 */
export interface IPlayerData {
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    attack: number;
    defense: number;
    speed: number;
    luck: number;
    gold: number;
    inventory: string[];    // 背包道具ID列表
    equippedItems: Map<string, string>; // 装备的道具
    upgrades: Map<string, number>; // 升级等级
    achievements: string[]; // 成就列表
    statistics: Map<string, number>; // 统计数据
}

/**
 * 设置数据接口
 */
export interface ISettingsData {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    language: string;
    graphicsQuality: number;
    fullscreen: boolean;
    vsync: boolean;
    keyBindings: Map<string, string>; // 按键绑定
}

/**
 * 存档系统
 * 负责游戏数据的保存和加载
 */
@ccclass('SaveSystem')
export class SaveSystem extends Component {
    private static _instance: SaveSystem = null;
    
    // 存档管理
    private _currentSaveData: ISaveData = null;
    private _autoSaveInterval: number = 300; // 自动存档间隔（秒）
    private _maxAutoSaves: number = 5; // 最大自动存档数量
    private _maxManualSaves: number = 10; // 最大手动存档数量
    
    // 存档键名
    private readonly SAVE_KEY_PREFIX = "thronefall_save_";
    private readonly SETTINGS_KEY = "thronefall_settings";
    private readonly STATISTICS_KEY = "thronefall_statistics";
    
    // 当前版本
    private readonly CURRENT_VERSION = "1.0.0";
    
    /**
     * 获取单例实例
     */
    public static getInstance(): SaveSystem {
        return SaveSystem._instance;
    }
    
    onLoad() {
        if (SaveSystem._instance === null) {
            SaveSystem._instance = this;
            this.initializeSaveSystem();
        } else {
            this.node.destroy();
        }
    }
    
    /**
     * 初始化存档系统
     */
    private initializeSaveSystem(): void {
        console.log("存档系统初始化");
        
        // 加载设置数据
        this.loadSettings();
        
        // 设置自动存档
        this.setupAutoSave();
        
        console.log("存档系统初始化完成");
    }
    
    /**
     * 设置自动存档
     */
    private setupAutoSave(): void {
        this.schedule(this.autoSave, this._autoSaveInterval);
        console.log(`自动存档已设置，间隔: ${this._autoSaveInterval}秒`);
    }
    
    /**
     * 创建新存档
     */
    public createNewSave(): ISaveData {
        const gameState = GameState.getInstance();
        
        const saveData: ISaveData = {
            version: this.CURRENT_VERSION,
            timestamp: Date.now(),
            saveType: SaveType.MANUAL,
            gameData: {
                currentState: gameState.getCurrentState(),
                gameMode: gameState.getGameMode(),
                dayCount: gameState.getDayCount(),
                nightCount: gameState.getNightCount(),
                score: 0,
                playTime: 0,
                level: 1,
                experience: 0
            },
            playerData: {
                health: 100,
                maxHealth: 100,
                mana: 50,
                maxMana: 50,
                attack: 20,
                defense: 5,
                speed: 1.0,
                luck: 1.0,
                gold: 1000,
                inventory: [],
                equippedItems: new Map(),
                upgrades: new Map(),
                achievements: [],
                statistics: new Map()
            },
            settingsData: this.getDefaultSettings()
        };
        
        this._currentSaveData = saveData;
        console.log("创建新存档");
        return saveData;
    }
    
    /**
     * 保存游戏数据
     */
    public saveGame(saveType: SaveType = SaveType.MANUAL): boolean {
        if (!this._currentSaveData) {
            console.warn("没有当前存档数据");
            return false;
        }
        
        try {
            // 更新存档数据
            this.updateSaveData();
            
            // 设置存档类型和时间戳
            this._currentSaveData.saveType = saveType;
            this._currentSaveData.timestamp = Date.now();
            
            // 生成存档键名
            const saveKey = this.generateSaveKey(saveType);
            
            // 序列化数据
            const serializedData = this.serializeSaveData(this._currentSaveData);
            
            // 保存到本地存储
            sys.localStorage.setItem(saveKey, serializedData);
            
            console.log(`游戏已保存: ${saveKey}`);
            return true;
            
        } catch (error) {
            console.error("保存游戏失败:", error);
            return false;
        }
    }
    
    /**
     * 加载游戏数据
     */
    public loadGame(saveType: SaveType = SaveType.MANUAL): boolean {
        try {
            const saveKey = this.generateSaveKey(saveType);
            const serializedData = sys.localStorage.getItem(saveKey);
            
            if (!serializedData) {
                console.warn(`存档不存在: ${saveKey}`);
                return false;
            }
            
            // 反序列化数据
            const saveData = this.deserializeSaveData(serializedData);
            
            // 检查版本兼容性
            if (!this.checkVersionCompatibility(saveData.version)) {
                console.warn("存档版本不兼容");
                return false;
            }
            
            // 应用存档数据
            this.applySaveData(saveData);
            
            this._currentSaveData = saveData;
            console.log(`游戏已加载: ${saveKey}`);
            return true;
            
        } catch (error) {
            console.error("加载游戏失败:", error);
            return false;
        }
    }
    
    /**
     * 自动存档
     */
    private autoSave(): void {
        if (!this._currentSaveData) {
            return;
        }
        
        console.log("执行自动存档");
        this.saveGame(SaveType.AUTO);
        
        // 清理旧的自动存档
        this.cleanupOldAutoSaves();
    }
    
    /**
     * 清理旧的自动存档
     */
    private cleanupOldAutoSaves(): void {
        const autoSaveKeys = this.getAutoSaveKeys();
        if (autoSaveKeys.length > this._maxAutoSaves) {
            // 按时间戳排序，删除最旧的
            autoSaveKeys.sort((a, b) => {
                const dataA = sys.localStorage.getItem(a);
                const dataB = sys.localStorage.getItem(b);
                if (!dataA || !dataB) return 0;
                
                const saveA = this.deserializeSaveData(dataA);
                const saveB = this.deserializeSaveData(dataB);
                return saveA.timestamp - saveB.timestamp;
            });
            
            // 删除多余的存档
            const toDelete = autoSaveKeys.slice(0, autoSaveKeys.length - this._maxAutoSaves);
            toDelete.forEach(key => {
                sys.localStorage.removeItem(key);
                console.log(`删除旧自动存档: ${key}`);
            });
        }
    }
    
    /**
     * 获取自动存档键名列表
     */
    private getAutoSaveKeys(): string[] {
        const keys: string[] = [];
        for (let i = 0; i < sys.localStorage.length; i++) {
            const key = sys.localStorage.key(i);
            if (key && key.startsWith(`${this.SAVE_KEY_PREFIX}auto_`)) {
                keys.push(key);
            }
        }
        return keys;
    }
    
    /**
     * 更新存档数据
     */
    private updateSaveData(): void {
        if (!this._currentSaveData) return;
        
        const gameState = GameState.getInstance();
        
        // 更新游戏数据
        this._currentSaveData.gameData.currentState = gameState.getCurrentState();
        this._currentSaveData.gameData.gameMode = gameState.getGameMode();
        this._currentSaveData.gameData.dayCount = gameState.getDayCount();
        this._currentSaveData.gameData.nightCount = gameState.getNightCount();
        
        // 这里应该从各个系统获取最新数据
        // 例如：从塔防系统获取分数，从肉鸽系统获取玩家数据等
        
        console.log("存档数据已更新");
    }
    
    /**
     * 应用存档数据
     */
    private applySaveData(saveData: ISaveData): void {
        const gameState = GameState.getInstance();
        
        // 应用游戏状态
        gameState.setGameMode(saveData.gameData.gameMode);
        
        // 这里应该将数据应用到各个系统
        // 例如：设置塔防系统的分数，肉鸽系统的玩家数据等
        
        console.log("存档数据已应用");
    }
    
    /**
     * 生成存档键名
     */
    private generateSaveKey(saveType: SaveType): string {
        const timestamp = Date.now();
        switch (saveType) {
            case SaveType.AUTO:
                return `${this.SAVE_KEY_PREFIX}auto_${timestamp}`;
            case SaveType.MANUAL:
                return `${this.SAVE_KEY_PREFIX}manual_${timestamp}`;
            case SaveType.QUICK:
                return `${this.SAVE_KEY_PREFIX}quick_${timestamp}`;
            case SaveType.CLOUD:
                return `${this.SAVE_KEY_PREFIX}cloud_${timestamp}`;
            default:
                return `${this.SAVE_KEY_PREFIX}save_${timestamp}`;
        }
    }
    
    /**
     * 序列化存档数据
     */
    private serializeSaveData(saveData: ISaveData): string {
        // 将Map转换为普通对象
        const serializableData = {
            ...saveData,
            playerData: {
                ...saveData.playerData,
                equippedItems: Array.from(saveData.playerData.equippedItems).reduce((obj, [key, value]) => {
                    obj[key] = value;
                    return obj;
                }, {}),
                upgrades: Array.from(saveData.playerData.upgrades).reduce((obj, [key, value]) => {
                    obj[key] = value;
                    return obj;
                }, {}),
                statistics: Array.from(saveData.playerData.statistics).reduce((obj, [key, value]) => {
                    obj[key] = value;
                    return obj;
                }, {})
            },
            settingsData: {
                ...saveData.settingsData,
                keyBindings: Array.from(saveData.settingsData.keyBindings).reduce((obj, [key, value]) => {
                    obj[key] = value;
                    return obj;
                }, {})
            }
        };
        
        return JSON.stringify(serializableData);
    }
    
    /**
     * 反序列化存档数据
     */
    private deserializeSaveData(serializedData: string): ISaveData {
        const data = JSON.parse(serializedData);
        
        // 将普通对象转换回Map
        data.playerData.equippedItems = new Map(Object.keys(data.playerData.equippedItems).map(key => [key, data.playerData.equippedItems[key]]));
        data.playerData.upgrades = new Map(Object.keys(data.playerData.upgrades).map(key => [key, data.playerData.upgrades[key]]));
        data.playerData.statistics = new Map(Object.keys(data.playerData.statistics).map(key => [key, data.playerData.statistics[key]]));
        data.settingsData.keyBindings = new Map(Object.keys(data.settingsData.keyBindings).map(key => [key, data.settingsData.keyBindings[key]]));
        
        return data;
    }
    
    /**
     * 检查版本兼容性
     */
    private checkVersionCompatibility(version: string): boolean {
        // 简单的版本检查，实际项目中可能需要更复杂的版本管理
        return version === this.CURRENT_VERSION;
    }
    
    /**
     * 保存设置
     */
    public saveSettings(settings: ISettingsData): boolean {
        try {
            const serializedSettings = JSON.stringify({
                ...settings,
                keyBindings: Array.from(settings.keyBindings).reduce((obj, [key, value]) => {
                    obj[key] = value;
                    return obj;
                }, {})
            });
            
            sys.localStorage.setItem(this.SETTINGS_KEY, serializedSettings);
            console.log("设置已保存");
            return true;
        } catch (error) {
            console.error("保存设置失败:", error);
            return false;
        }
    }
    
    /**
     * 加载设置
     */
    public loadSettings(): ISettingsData {
        try {
            const serializedSettings = sys.localStorage.getItem(this.SETTINGS_KEY);
            if (!serializedSettings) {
                return this.getDefaultSettings();
            }
            
            const data = JSON.parse(serializedSettings);
            // 将对象转换为键值对数组,再创建Map
            data.keyBindings = new Map(Object.keys(data.keyBindings).map(key => [key, data.keyBindings[key]]));
            
            console.log("设置已加载");
            return data;
        } catch (error) {
            console.error("加载设置失败:", error);
            return this.getDefaultSettings();
        }
    }
    
    /**
     * 获取默认设置
     */
    private getDefaultSettings(): ISettingsData {
        return {
            masterVolume: 1.0,
            musicVolume: 0.8,
            sfxVolume: 0.9,
            language: "zh-CN",
            graphicsQuality: 2,
            fullscreen: false,
            vsync: true,
            keyBindings: new Map([
                ["move_up", "W"],
                ["move_down", "S"],
                ["move_left", "A"],
                ["move_right", "D"],
                ["attack", "Space"],
                ["inventory", "I"],
                ["pause", "Escape"]
            ])
        };
    }
    
    /**
     * 删除存档
     */
    public deleteSave(saveType: SaveType, timestamp?: number): boolean {
        try {
            const saveKey = timestamp ? 
                this.generateSaveKey(saveType).replace(/\d+$/, timestamp.toString()) :
                this.generateSaveKey(saveType);
            
            sys.localStorage.removeItem(saveKey);
            console.log(`存档已删除: ${saveKey}`);
            return true;
        } catch (error) {
            console.error("删除存档失败:", error);
            return false;
        }
    }
    
    /**
     * 获取存档列表
     */
    public getSaveList(): Array<{key: string, data: ISaveData}> {
        const saveList: Array<{key: string, data: ISaveData}> = [];
        
        for (let i = 0; i < sys.localStorage.length; i++) {
            const key = sys.localStorage.key(i);
            if (key && key.startsWith(this.SAVE_KEY_PREFIX)) {
                try {
                    const serializedData = sys.localStorage.getItem(key);
                    if (serializedData) {
                        const data = this.deserializeSaveData(serializedData);
                        saveList.push({ key, data });
                    }
                } catch (error) {
                    console.error(`解析存档失败: ${key}`, error);
                }
            }
        }
        
        // 按时间戳排序
        saveList.sort((a, b) => b.data.timestamp - a.data.timestamp);
        
        return saveList;
    }
    
    /**
     * 检查存档是否存在
     */
    public hasSave(saveType: SaveType): boolean {
        const saveKey = this.generateSaveKey(saveType);
        return sys.localStorage.getItem(saveKey) !== null;
    }
    
    /**
     * 获取当前存档数据
     */
    public getCurrentSaveData(): ISaveData | null {
        return this._currentSaveData;
    }
    
    /**
     * 设置当前存档数据
     */
    public setCurrentSaveData(saveData: ISaveData): void {
        this._currentSaveData = saveData;
    }
    
    /**
     * 清空所有存档
     */
    public clearAllSaves(): void {
        const keysToDelete: string[] = [];
        
        for (let i = 0; i < sys.localStorage.length; i++) {
            const key = sys.localStorage.key(i);
            if (key && key.startsWith(this.SAVE_KEY_PREFIX)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            sys.localStorage.removeItem(key);
        });
        
        this._currentSaveData = null;
        console.log("所有存档已清空");
    }
    
    onDestroy() {
        if (SaveSystem._instance === this) {
            SaveSystem._instance = null;
        }
    }
}
