import { _decorator, sys } from 'cc';
import { EventBus } from './EventBus';
import { EventType } from './EventBus';
import { logger, LogCategory } from './Logger';

/**
 * 存档类型枚举
 */
export enum SaveType {
    /** 自动存档 */
    AUTO = 'auto',
    /** 手动存档 */
    MANUAL = 'manual',
    /** 快速存档 */
    QUICK = 'quick',
    /** 设置存档 */
    SETTINGS = 'settings',
    /** 永久升级存档 */
    PERMANENT_UPGRADES = 'permanent_upgrades'
}

/**
 * 存档数据接口
 */
export interface ISaveData {
    /** 存档ID */
    id: string;
    /** 存档类型 */
    type: SaveType;
    /** 存档名称 */
    name: string;
    /** 存档时间 */
    timestamp: number;
    /** 游戏版本 */
    gameVersion: string;
    /** 游戏模式 */
    gameMode: string;
    /** 游戏进度数据 */
    gameProgress: any;
    /** 玩家数据 */
    playerData: any;
    /** 游戏状态数据 */
    gameStateData: any;
    /** 场景数据 */
    sceneData: any;
    /** 截图数据（Base64） */
    screenshot?: string;
}

/**
 * 永久升级数据接口
 */
export interface IPermanentUpgradeData {
    /** 已解锁的升级ID列表 */
    unlockedUpgrades: string[];
    /** 升级等级映射表 */
    upgradeLevel: Record<string, number>;
    /** 可用升级点数 */
    availablePoints: number;
    /** 总获得升级点数 */
    totalPointsEarned: number;
    /** 解锁时间记录 */
    unlockTimestamps: Record<string, number>;
}

/**
 * 存档管理器类
 * 负责游戏数据的保存、加载和管理
 */
export class SaveManager {
    private static _instance: SaveManager = null;
    
    /** 存档键前缀 */
    private readonly SAVE_KEY_PREFIX = 'thronefall_save_';
    /** 设置键 */
    private readonly SETTINGS_KEY = 'thronefall_settings';
    /** 永久升级键 */
    private readonly PERMANENT_UPGRADES_KEY = 'thronefall_permanent_upgrades';
    /** 自动存档间隔（毫秒） */
    private readonly AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5分钟
    
    /** 当前游戏版本 */
    private _gameVersion: string = '0.1.0';
    /** 存档列表 */
    private _saveList: ISaveData[] = [];
    /** 永久升级数据 */
    private _permanentUpgrades: IPermanentUpgradeData = null;
    /** 自动存档计时器 */
    private _autoSaveTimer: number = null;
    /** 是否已初始化 */
    private _initialized: boolean = false;
    
    /**
     * 获取单例实例
     */
    public static getInstance(): SaveManager {
        if (!this._instance) {
            this._instance = new SaveManager();
        }
        return this._instance;
    }
    
    /**
     * 私有构造函数
     */
    private constructor() {
        if (SaveManager._instance) {
            logger.warn(LogCategory.SYSTEM, '尝试创建SaveManager的多个实例');
            return;
        }
    }
    
    /**
     * 初始化存档管理器
     */
    public initialize(): void {
        if (this._initialized) {
            return;
        }
        
        logger.info(LogCategory.SYSTEM, '初始化存档管理器');
        
        // 加载存档列表
        this._loadSaveList();
        
        // 加载永久升级数据
        this._loadPermanentUpgrades();
        
        // 注册事件监听
        this._registerEvents();
        
        // 启动自动存档
        this._startAutoSave();
        
        this._initialized = true;
    }
    
    /**
     * 注册事件监听
     */
    private _registerEvents(): void {
        // 监听游戏状态变化事件
        EventBus.getInstance().on(EventType.GAME_STATE_CHANGED, this._onGameStateChanged, this);
        
        // 监听日夜转换事件
        EventBus.getInstance().on(EventType.DAY_NIGHT_TRANSITION, this._onDayNightTransition, this);
        
        // 监听关卡完成事件
        EventBus.getInstance().on(EventType.LEVEL_COMPLETED, this._onLevelCompleted, this);
        
        // 监听肉鸽运行结束事件
        EventBus.getInstance().on(EventType.ROGUELIKE_RUN_ENDED, this._onRoguelikeRunEnded, this);
    }
    
    /**
     * 启动自动存档
     */
    private _startAutoSave(): void {
        // 清除现有计时器
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = null;
        }
        
        // 设置新计时器
        this._autoSaveTimer = setInterval(() => {
            this.createAutoSave();
        }, this.AUTO_SAVE_INTERVAL);
    }
    
    /**
     * 停止自动存档
     */
    private _stopAutoSave(): void {
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = null;
        }
    }
    
    /**
     * 加载存档列表
     */
    private _loadSaveList(): void {
        try {
            // 获取所有本地存储键
            const keys = Object.keys(sys.localStorage);
            
            // 筛选出存档键
            const saveKeys = keys.filter(key => key.startsWith(this.SAVE_KEY_PREFIX));
            
            // 清空存档列表
            this._saveList = [];
            
            // 加载每个存档
            saveKeys.forEach(key => {
                try {
                    const saveDataStr = sys.localStorage.getItem(key);
                    if (saveDataStr) {
                        const saveData = JSON.parse(saveDataStr) as ISaveData;
                        this._saveList.push(saveData);
                    }
                } catch (e) {
                    logger.error(LogCategory.SYSTEM, `加载存档失败: ${key}`, e);
                }
            });
            
            // 按时间戳排序（降序）
            this._saveList.sort((a, b) => b.timestamp - a.timestamp);
            
            logger.info(LogCategory.SYSTEM, `加载存档列表完成，共${this._saveList.length}个存档`);
        } catch (e) {
            logger.error(LogCategory.SYSTEM, '加载存档列表失败', e);
            this._saveList = [];
        }
    }
    
    /**
     * 加载永久升级数据
     */
    private _loadPermanentUpgrades(): void {
        try {
            const upgradeDataStr = sys.localStorage.getItem(this.PERMANENT_UPGRADES_KEY);
            
            if (upgradeDataStr) {
                this._permanentUpgrades = JSON.parse(upgradeDataStr) as IPermanentUpgradeData;
                logger.info(LogCategory.SYSTEM, `加载永久升级数据成功，已解锁${this._permanentUpgrades.unlockedUpgrades.length}个升级`);
            } else {
                // 初始化永久升级数据
                this._initPermanentUpgrades();
            }
        } catch (e) {
            logger.error(LogCategory.SYSTEM, '加载永久升级数据失败', e);
            // 初始化永久升级数据
            this._initPermanentUpgrades();
        }
    }
    
    /**
     * 初始化永久升级数据
     */
    private _initPermanentUpgrades(): void {
        this._permanentUpgrades = {
            unlockedUpgrades: [],
            upgradeLevel: {},
            availablePoints: 0,
            totalPointsEarned: 0,
            unlockTimestamps: {}
        };
        
        // 保存初始化的永久升级数据
        this._savePermanentUpgrades();
        
        logger.info(LogCategory.SYSTEM, '初始化永久升级数据');
    }
    
    /**
     * 保存永久升级数据
     */
    private _savePermanentUpgrades(): void {
        try {
            const upgradeDataStr = JSON.stringify(this._permanentUpgrades);
            sys.localStorage.setItem(this.PERMANENT_UPGRADES_KEY, upgradeDataStr);
            logger.info(LogCategory.SYSTEM, '保存永久升级数据成功');
        } catch (e) {
            logger.error(LogCategory.SYSTEM, '保存永久升级数据失败', e);
        }
    }
    
    /**
     * 创建自动存档
     */
    public createAutoSave(): void {
        logger.info(LogCategory.SYSTEM, '创建自动存档');
        
        // 触发存档前事件
        EventBus.getInstance().emit(EventType.BEFORE_SAVE, { type: SaveType.AUTO });
        
        // 创建存档数据
        const saveData = this._createSaveData(SaveType.AUTO, '自动存档');
        
        // 保存存档
        this._saveGame(saveData);
        
        // 触发存档后事件
        EventBus.getInstance().emit(EventType.AFTER_SAVE, { type: SaveType.AUTO, saveData });
    }
    
    /**
     * 创建快速存档
     */
    public createQuickSave(): void {
        logger.info(LogCategory.SYSTEM, '创建快速存档');
        
        // 触发存档前事件
        EventBus.getInstance().emit(EventType.BEFORE_SAVE, { type: SaveType.QUICK });
        
        // 创建存档数据
        const saveData = this._createSaveData(SaveType.QUICK, '快速存档');
        
        // 保存存档
        this._saveGame(saveData);
        
        // 触发存档后事件
        EventBus.getInstance().emit(EventType.AFTER_SAVE, { type: SaveType.QUICK, saveData });
    }
    
    /**
     * 创建手动存档
     * @param name 存档名称
     */
    public createManualSave(name: string): void {
        logger.info(LogCategory.SYSTEM, `创建手动存档: ${name}`);
        
        // 触发存档前事件
        EventBus.getInstance().emit(EventType.BEFORE_SAVE, { type: SaveType.MANUAL });
        
        // 创建存档数据
        const saveData = this._createSaveData(SaveType.MANUAL, name || `存档 ${new Date().toLocaleString()}`);
        
        // 保存存档
        this._saveGame(saveData);
        
        // 触发存档后事件
        EventBus.getInstance().emit(EventType.AFTER_SAVE, { type: SaveType.MANUAL, saveData });
    }
    
    /**
     * 创建存档数据
     * @param type 存档类型
     * @param name 存档名称
     */
    private _createSaveData(type: SaveType, name: string): ISaveData {
        // 获取游戏状态数据
        const gameStateData = this._getGameStateData();
        
        // 获取玩家数据
        const playerData = this._getPlayerData();
        
        // 获取场景数据
        const sceneData = this._getSceneData();
        
        // 获取游戏进度数据
        const gameProgress = this._getGameProgressData();
        
        // 获取游戏模式
        const gameMode = this._getGameMode();
        
        // 创建存档ID
        const id = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // 创建存档数据
        const saveData: ISaveData = {
            id,
            type,
            name,
            timestamp: Date.now(),
            gameVersion: this._gameVersion,
            gameMode,
            gameProgress,
            playerData,
            gameStateData,
            sceneData
        };
        
        // 获取游戏截图（如果支持）
        this._captureScreenshot().then(screenshot => {
            if (screenshot) {
                saveData.screenshot = screenshot;
                // 更新存档
                this._updateSave(saveData);
            }
        }).catch(e => {
            logger.error(LogCategory.SYSTEM, '获取游戏截图失败', e);
        });
        
        return saveData;
    }
    
    /**
     * 保存游戏
     * @param saveData 存档数据
     */
    private _saveGame(saveData: ISaveData): void {
        try {
            // 将存档数据转换为字符串
            const saveDataStr = JSON.stringify(saveData);
            
            // 生成存档键
            const saveKey = `${this.SAVE_KEY_PREFIX}${saveData.id}`;
            
            // 保存到本地存储
            sys.localStorage.setItem(saveKey, saveDataStr);
            
            // 更新存档列表
            this._updateSaveList(saveData);
            
            logger.info(LogCategory.SYSTEM, `保存游戏成功: ${saveData.name}`);
        } catch (e) {
            logger.error(LogCategory.SYSTEM, `保存游戏失败: ${saveData.name}`, e);
            
            // 触发存档失败事件
            EventBus.getInstance().emit(EventType.SAVE_FAILED, {
                saveData,
                error: e
            });
        }
    }
    
    /**
     * 更新存档列表
     * @param saveData 存档数据
     */
    private _updateSaveList(saveData: ISaveData): void {
        // 查找是否已存在相同ID的存档
        const existingIndex = this._saveList.findIndex(save => save.id === saveData.id);
        
        if (existingIndex >= 0) {
            // 更新现有存档
            this._saveList[existingIndex] = saveData;
        } else {
            // 添加新存档
            this._saveList.push(saveData);
            
            // 按时间戳排序（降序）
            this._saveList.sort((a, b) => b.timestamp - a.timestamp);
        }
    }
    
    /**
     * 更新存档
     * @param saveData 存档数据
     */
    private _updateSave(saveData: ISaveData): void {
        try {
            // 将存档数据转换为字符串
            const saveDataStr = JSON.stringify(saveData);
            
            // 生成存档键
            const saveKey = `${this.SAVE_KEY_PREFIX}${saveData.id}`;
            
            // 保存到本地存储
            sys.localStorage.setItem(saveKey, saveDataStr);
            
            // 更新存档列表
            this._updateSaveList(saveData);
            
            logger.debug(LogCategory.SYSTEM, `更新存档成功: ${saveData.name}`);
        } catch (e) {
            logger.error(LogCategory.SYSTEM, `更新存档失败: ${saveData.name}`, e);
        }
    }
    
    /**
     * 加载游戏
     * @param saveId 存档ID
     */
    public loadGame(saveId: string): void {
        logger.info(LogCategory.SYSTEM, `加载游戏: ${saveId}`);
        
        // 查找存档
        const saveData = this._saveList.find(save => save.id === saveId);
        
        if (!saveData) {
            logger.error(LogCategory.SYSTEM, `存档不存在: ${saveId}`);
            
            // 触发加载失败事件
            EventBus.getInstance().emit(EventType.LOAD_FAILED, {
                saveId,
                error: new Error('存档不存在')
            });
            
            return;
        }
        
        // 触发加载前事件
        EventBus.getInstance().emit(EventType.BEFORE_LOAD, { saveData });
        
        try {
            // 应用游戏状态数据
            this._applyGameStateData(saveData.gameStateData);
            
            // 应用玩家数据
            this._applyPlayerData(saveData.playerData);
            
            // 应用场景数据
            this._applySceneData(saveData.sceneData);
            
            // 触发加载后事件
            EventBus.getInstance().emit(EventType.AFTER_LOAD, { saveData });
            
            logger.info(LogCategory.SYSTEM, `加载游戏成功: ${saveData.name}`);
        } catch (e) {
            logger.error(LogCategory.SYSTEM, `加载游戏失败: ${saveData.name}`, e);
            
            // 触发加载失败事件
            EventBus.getInstance().emit(EventType.LOAD_FAILED, {
                saveId,
                saveData,
                error: e
            });
        }
    }
    
    /**
     * 删除存档
     * @param saveId 存档ID
     */
    public deleteSave(saveId: string): void {
        logger.info(LogCategory.SYSTEM, `删除存档: ${saveId}`);
        
        // 查找存档
        const saveIndex = this._saveList.findIndex(save => save.id === saveId);
        
        if (saveIndex < 0) {
            logger.warn(LogCategory.SYSTEM, `存档不存在: ${saveId}`);
            return;
        }
        
        const saveData = this._saveList[saveIndex];
        
        try {
            // 生成存档键
            const saveKey = `${this.SAVE_KEY_PREFIX}${saveId}`;
            
            // 从本地存储中删除
            sys.localStorage.removeItem(saveKey);
            
            // 从存档列表中删除
            this._saveList.splice(saveIndex, 1);
            
            // 触发删除存档事件
            EventBus.getInstance().emit(EventType.SAVE_DELETED, { saveData });
            
            logger.info(LogCategory.SYSTEM, `删除存档成功: ${saveData.name}`);
        } catch (e) {
            logger.error(LogCategory.SYSTEM, `删除存档失败: ${saveData.name}`, e);
        }
    }
    
    /**
     * 获取存档列表
     */
    public getSaveList(): ISaveData[] {
        return [...this._saveList];
    }
    
    /**
     * 获取存档
     * @param saveId 存档ID
     */
    public getSave(saveId: string): ISaveData {
        return this._saveList.find(save => save.id === saveId);
    }
    
    /**
     * 获取最新的自动存档
     */
    public getLatestAutoSave(): ISaveData {
        return this._saveList.find(save => save.type === SaveType.AUTO);
    }
    
    /**
     * 获取最新的快速存档
     */
    public getLatestQuickSave(): ISaveData {
        return this._saveList.find(save => save.type === SaveType.QUICK);
    }
    
    /**
     * 获取游戏状态数据
     */
    private _getGameStateData(): any {
        // 触发获取游戏状态数据事件
        let gameStateData = null;
        
        EventBus.getInstance().emit(EventType.GET_GAME_STATE_DATA, {
            callback: (data: any) => {
                gameStateData = data;
            }
        });
        
        return gameStateData;
    }
    
    /**
     * 获取玩家数据
     */
    private _getPlayerData(): any {
        // 触发获取玩家数据事件
        let playerData = null;
        
        EventBus.getInstance().emit(EventType.GET_PLAYER_DATA, {
            callback: (data: any) => {
                playerData = data;
            }
        });
        
        return playerData;
    }
    
    /**
     * 获取场景数据
     */
    private _getSceneData(): any {
        // 触发获取场景数据事件
        let sceneData = null;
        
        EventBus.getInstance().emit(EventType.GET_SCENE_DATA, {
            callback: (data: any) => {
                sceneData = data;
            }
        });
        
        return sceneData;
    }
    
    /**
     * 获取游戏进度数据
     */
    private _getGameProgressData(): any {
        // 触发获取游戏进度数据事件
        let gameProgressData = null;
        
        EventBus.getInstance().emit(EventType.GET_GAME_PROGRESS_DATA, {
            callback: (data: any) => {
                gameProgressData = data;
            }
        });
        
        return gameProgressData;
    }
    
    /**
     * 获取游戏模式
     */
    private _getGameMode(): string {
        // 触发获取游戏模式事件
        let gameMode = '';
        
        EventBus.getInstance().emit(EventType.GET_GAME_MODE, {
            callback: (mode: string) => {
                gameMode = mode;
            }
        });
        
        return gameMode;
    }
    
    /**
     * 应用游戏状态数据
     * @param gameStateData 游戏状态数据
     */
    private _applyGameStateData(gameStateData: any): void {
        // 触发应用游戏状态数据事件
        EventBus.getInstance().emit(EventType.APPLY_GAME_STATE_DATA, { gameStateData });
    }
    
    /**
     * 应用玩家数据
     * @param playerData 玩家数据
     */
    private _applyPlayerData(playerData: any): void {
        // 触发应用玩家数据事件
        EventBus.getInstance().emit(EventType.APPLY_PLAYER_DATA, { playerData });
    }
    
    /**
     * 应用场景数据
     * @param sceneData 场景数据
     */
    private _applySceneData(sceneData: any): void {
        // 触发应用场景数据事件
        EventBus.getInstance().emit(EventType.APPLY_SCENE_DATA, { sceneData });
    }
    
    /**
     * 获取游戏截图
     */
    private async _captureScreenshot(): Promise<string> {
        return new Promise<string>((resolve) => {
            // 触发获取游戏截图事件
            let screenshot = null;
            
            EventBus.getInstance().emit(EventType.CAPTURE_SCREENSHOT, {
                callback: (data: string) => {
                    screenshot = data;
                    resolve(screenshot);
                }
            });
            
            // 如果5秒内没有回调，则返回null
            setTimeout(() => {
                if (!screenshot) {
                    resolve(null);
                }
            }, 5000);
        });
    }
    
    /**
     * 游戏状态变化事件处理
     * @param data 事件数据
     */
    private _onGameStateChanged(data: any): void {
        // 根据游戏状态变化执行相应操作
        logger.debug(LogCategory.SYSTEM, `游戏状态变化: ${JSON.stringify(data)}`);
    }
    
    /**
     * 日夜转换事件处理
     * @param data 事件数据
     */
    private _onDayNightTransition(data: any): void {
        // 日夜转换时自动保存
        logger.info(LogCategory.SYSTEM, `日夜转换，创建自动存档: ${data.toDayTime ? '夜->日' : '日->夜'}`);
        this.createAutoSave();
    }
    
    /**
     * 关卡完成事件处理
     * @param data 事件数据
     */
    private _onLevelCompleted(data: any): void {
        // 关卡完成时自动保存
        logger.info(LogCategory.SYSTEM, `关卡完成，创建自动存档: 关卡${data.level}`);
        this.createAutoSave();
        
        // 更新永久升级点数
        this._addPermanentUpgradePoints(data.rewardPoints || 1);
    }
    
    /**
     * 肉鸽运行结束事件处理
     * @param data 事件数据
     */
    private _onRoguelikeRunEnded(data: any): void {
        // 肉鸽运行结束时自动保存
        logger.info(LogCategory.SYSTEM, `肉鸽运行结束，创建自动存档: ${data.success ? '成功' : '失败'}`);
        this.createAutoSave();
        
        // 更新永久升级点数
        if (data.success) {
            this._addPermanentUpgradePoints(data.rewardPoints || 2);
        } else {
            this._addPermanentUpgradePoints(1); // 即使失败也给予一定奖励
        }
    }
    
    /**
     * 添加永久升级点数
     * @param points 点数
     */
    private _addPermanentUpgradePoints(points: number): void {
        if (!this._permanentUpgrades) {
            this._loadPermanentUpgrades();
        }
        
        this._permanentUpgrades.availablePoints += points;
        this._permanentUpgrades.totalPointsEarned += points;
        
        // 保存永久升级数据
        this._savePermanentUpgrades();
        
        // 触发永久升级点数变化事件
        EventBus.getInstance().emit(EventType.PERMANENT_UPGRADE_POINTS_CHANGED, {
            availablePoints: this._permanentUpgrades.availablePoints,
            totalPointsEarned: this._permanentUpgrades.totalPointsEarned,
            addedPoints: points
        });
        
        logger.info(LogCategory.SYSTEM, `添加永久升级点数: +${points}，当前可用: ${this._permanentUpgrades.availablePoints}`);
    }
    
    /**
     * 解锁永久升级
     * @param upgradeId 升级ID
     * @param cost 消耗点数
     */
    public unlockPermanentUpgrade(upgradeId: string, cost: number): boolean {
        if (!this._permanentUpgrades) {
            this._loadPermanentUpgrades();
        }
        
        // 检查是否已解锁
        if (this._permanentUpgrades.unlockedUpgrades.includes(upgradeId)) {
            logger.warn(LogCategory.SYSTEM, `永久升级已解锁: ${upgradeId}`);
            return false;
        }
        
        // 检查点数是否足够
        if (this._permanentUpgrades.availablePoints < cost) {
            logger.warn(LogCategory.SYSTEM, `永久升级点数不足: 需要${cost}，当前${this._permanentUpgrades.availablePoints}`);
            return false;
        }
        
        // 扣除点数
        this._permanentUpgrades.availablePoints -= cost;
        
        // 添加到已解锁列表
        this._permanentUpgrades.unlockedUpgrades.push(upgradeId);
        
        // 设置解锁时间
        this._permanentUpgrades.unlockTimestamps[upgradeId] = Date.now();
        
        // 初始化升级等级
        this._permanentUpgrades.upgradeLevel[upgradeId] = 1;
        
        // 保存永久升级数据
        this._savePermanentUpgrades();
        
        // 触发永久升级解锁事件
        EventBus.getInstance().emit(EventType.PERMANENT_UPGRADE_UNLOCKED, {
            upgradeId,
            cost,
            availablePoints: this._permanentUpgrades.availablePoints
        });
        
        logger.info(LogCategory.SYSTEM, `解锁永久升级: ${upgradeId}，消耗${cost}点，剩余${this._permanentUpgrades.availablePoints}点`);
        
        return true;
    }
    
    /**
     * 升级永久升级
     * @param upgradeId 升级ID
     * @param cost 消耗点数
     */
    public upgradePermanentUpgrade(upgradeId: string, cost: number): boolean {
        if (!this._permanentUpgrades) {
            this._loadPermanentUpgrades();
        }
        
        // 检查是否已解锁
        if (!this._permanentUpgrades.unlockedUpgrades.includes(upgradeId)) {
            logger.warn(LogCategory.SYSTEM, `永久升级未解锁: ${upgradeId}`);
            return false;
        }
        
        // 检查点数是否足够
        if (this._permanentUpgrades.availablePoints < cost) {
            logger.warn(LogCategory.SYSTEM, `永久升级点数不足: 需要${cost}，当前${this._permanentUpgrades.availablePoints}`);
            return false;
        }
        
        // 获取当前等级
        const currentLevel = this._permanentUpgrades.upgradeLevel[upgradeId] || 1;
        
        // 扣除点数
        this._permanentUpgrades.availablePoints -= cost;
        
        // 增加升级等级
        this._permanentUpgrades.upgradeLevel[upgradeId] = currentLevel + 1;
        
        // 保存永久升级数据
        this._savePermanentUpgrades();
        
        // 触发永久升级等级提升事件
        EventBus.getInstance().emit(EventType.PERMANENT_UPGRADE_LEVEL_INCREASED, {
            upgradeId,
            cost,
            oldLevel: currentLevel,
            newLevel: currentLevel + 1,
            availablePoints: this._permanentUpgrades.availablePoints
        });
        
        logger.info(LogCategory.SYSTEM, `提升永久升级等级: ${upgradeId}，${currentLevel} -> ${currentLevel + 1}，消耗${cost}点，剩余${this._permanentUpgrades.availablePoints}点`);
        
        return true;
    }
    
    /**
     * 获取永久升级数据
     */
    public getPermanentUpgrades(): IPermanentUpgradeData {
        if (!this._permanentUpgrades) {
            this._loadPermanentUpgrades();
        }
        
        return { ...this._permanentUpgrades };
    }
    
    /**
     * 检查永久升级是否已解锁
     * @param upgradeId 升级ID
     */
    public isPermanentUpgradeUnlocked(upgradeId: string): boolean {
        if (!this._permanentUpgrades) {
            this._loadPermanentUpgrades();
        }
        
        return this._permanentUpgrades.unlockedUpgrades.includes(upgradeId);
    }
    
    /**
     * 获取永久升级等级
     * @param upgradeId 升级ID
     */
    public getPermanentUpgradeLevel(upgradeId: string): number {
        if (!this._permanentUpgrades) {
            this._loadPermanentUpgrades();
        }
        
        return this._permanentUpgrades.upgradeLevel[upgradeId] || 0;
    }
    
    /**
     * 获取可用升级点数
     */
    public getAvailableUpgradePoints(): number {
        if (!this._permanentUpgrades) {
            this._loadPermanentUpgrades();
        }
        
        return this._permanentUpgrades.availablePoints;
    }
    
    /**
     * 保存游戏设置
     * @param settings 设置数据
     */
    public saveSettings(settings: any): void {
        try {
            const settingsStr = JSON.stringify(settings);
            sys.localStorage.setItem(this.SETTINGS_KEY, settingsStr);
            logger.info(LogCategory.SYSTEM, '保存游戏设置成功');
            
            // 触发设置保存事件
            EventBus.getInstance().emit(EventType.SETTINGS_SAVED, { settings });
        } catch (e) {
            logger.error(LogCategory.SYSTEM, '保存游戏设置失败', e);
        }
    }
    
    /**
     * 加载游戏设置
     */
    public loadSettings(): any {
        try {
            const settingsStr = sys.localStorage.getItem(this.SETTINGS_KEY);
            
            if (settingsStr) {
                const settings = JSON.parse(settingsStr);
                logger.info(LogCategory.SYSTEM, '加载游戏设置成功');
                return settings;
            }
        } catch (e) {
            logger.error(LogCategory.SYSTEM, '加载游戏设置失败', e);
        }
        
        return null;
    }
    
    /**
     * 清除所有存档数据（危险操作）
     */
    public clearAllSaveData(): void {
        logger.warn(LogCategory.SYSTEM, '清除所有存档数据');
        
        try {
            // 获取所有本地存储键
            const keys = Object.keys(sys.localStorage);
            
            // 筛选出存档键
            const saveKeys = keys.filter(key => key.startsWith(this.SAVE_KEY_PREFIX));
            
            // 删除每个存档
            saveKeys.forEach(key => {
                sys.localStorage.removeItem(key);
            });
            
            // 清空存档列表
            this._saveList = [];
            
            // 触发清除存档事件
            EventBus.getInstance().emit(EventType.ALL_SAVES_CLEARED);
            
            logger.info(LogCategory.SYSTEM, `清除所有存档数据成功，共删除${saveKeys.length}个存档`);
        } catch (e) {
            logger.error(LogCategory.SYSTEM, '清除所有存档数据失败', e);
        }
    }
    
    /**
     * 重置永久升级数据（危险操作）
     */
    public resetPermanentUpgrades(): void {
        logger.warn(LogCategory.SYSTEM, '重置永久升级数据');
        
        try {
            // 初始化永久升级数据
            this._initPermanentUpgrades();
            
            // 触发重置永久升级事件
            EventBus.getInstance().emit(EventType.PERMANENT_UPGRADES_RESET);
            
            logger.info(LogCategory.SYSTEM, '重置永久升级数据成功');
        } catch (e) {
            logger.error(LogCategory.SYSTEM, '重置永久升级数据失败', e);
        }
    }
    
    /**
     * 销毁存档管理器
     */
    public destroy(): void {
        // 停止自动存档
        this._stopAutoSave();
        
        // 移除事件监听
        EventBus.getInstance().off(EventType.GAME_STATE_CHANGED, this._onGameStateChanged, this);
        EventBus.getInstance().off(EventType.DAY_NIGHT_TRANSITION, this._onDayNightTransition, this);
        EventBus.getInstance().off(EventType.LEVEL_COMPLETED, this._onLevelCompleted, this);
        EventBus.getInstance().off(EventType.ROGUELIKE_RUN_ENDED, this._onRoguelikeRunEnded, this);
        
        // 清空单例
        SaveManager._instance = null;
        
        logger.info(LogCategory.SYSTEM, '销毁存档管理器');
    }
}

// 导出全局实例
export const saveManager = SaveManager.getInstance();