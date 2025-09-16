import { _decorator, sys } from 'cc';
import { EventBus, EventType } from './EventBus';
import { logger, LogCategory } from './Logger';
const { ccclass } = _decorator;

/**
 * 游戏状态枚举
 * 定义游戏中所有可能的状态
 */
export enum GameStateType {
    NONE = 0,           // 无状态
    MAIN_MENU = 1,      // 主菜单
    LOADING = 2,        // 加载中
    TOWER_DEFENSE = 3,  // 塔防模式（日间）
    ROGUELIKE = 4,      // 肉鸽模式（夜间）
    PAUSED = 5,         // 暂停
    GAME_OVER = 6,      // 游戏结束
    VICTORY = 7,        // 胜利
    SETTINGS = 8,       // 设置界面
    INVENTORY = 9,      // 背包界面
    UPGRADE = 10,       // 升级界面
    PLAYING = 11,       // 游戏进行中
}

/**
 * 游戏模式枚举
 */
export enum GameMode {
    NORMAL = 0,         // 普通模式
    HARD = 1,           // 困难模式
    NIGHTMARE = 2,      // 噩梦模式
    ENDLESS = 3,        // 无尽模式
}

/**
 * 游戏状态数据接口
 */
export interface IGameStateData {
    currentState: GameStateType;
    previousState: GameStateType;
    gameMode: GameMode;
    dayCount: number;
    nightCount: number;
    isTransitioning: boolean;
    transitionTime: number;
}

/**
 * 游戏状态管理器
 * 负责管理游戏的状态转换和状态数据
 */
@ccclass('GameState')
export class GameState {
    private static _instance: GameState = null;
    
    // 游戏状态数据
    private _stateData: IGameStateData = {
        currentState: GameStateType.NONE,
        previousState: GameStateType.NONE,
        gameMode: GameMode.NORMAL,
        dayCount: 0,
        nightCount: 0,
        isTransitioning: false,
        transitionTime: 0
    };
    
    // 全局游戏数据
    private _gameData: {
        gold: number,
        resources: { [key: string]: number },
        score: number,
        playerLevel: number,
        playerExperience: number,
        unlockedUpgrades: string[],
        unlockedTowers: string[],
        unlockedAbilities: string[],
        gameProgress: number
    } = {
        gold: 0,
        resources: {},
        score: 0,
        playerLevel: 1,
        playerExperience: 0,
        unlockedUpgrades: [],
        unlockedTowers: [],
        unlockedAbilities: [],
        gameProgress: 0
    };
    
    /**
     * 获取单例实例
     */
    public static getInstance(): GameState {
        if (!GameState._instance) {
            GameState._instance = new GameState();
        }
        return GameState._instance;
    }
    
    /**
     * 构造函数
     */
    constructor() {
        if (GameState._instance) {
            logger.warn(LogCategory.GAME, '尝试创建多个GameState实例，已使用现有实例');
            return GameState._instance;
        }
        
        GameState._instance = this;
        this._initState();
        logger.info(LogCategory.GAME, '游戏状态管理器初始化完成');
    }
    
    /**
     * 初始化状态
     */
    private _initState(): void {
        // 重置状态数据
        this._stateData = {
            currentState: GameStateType.NONE,
            previousState: GameStateType.NONE,
            gameMode: GameMode.NORMAL,
            dayCount: 0,
            nightCount: 0,
            isTransitioning: false,
            transitionTime: 0
        };
        
        // 重置游戏数据
        this._gameData = {
            gold: 100, // 初始金币
            resources: {},
            score: 0,
            playerLevel: 1,
            playerExperience: 0,
            unlockedUpgrades: [],
            unlockedTowers: ['basic_tower'], // 初始解锁的塔
            unlockedAbilities: ['basic_attack'], // 初始解锁的能力
            gameProgress: 0
        };
    }
    
    /**
     * 切换游戏状态
     * @param newState 新状态
     * @deprecated 请使用下方的changeState(newState, immediate)方法
     */
    private _legacyChangeState(newState: GameStateType): void {
        // 调用新的实现
        this.changeState(newState, false);
    }
    
    /**
     * 开始日夜转换
     * @param toDayTime 是否转换到日间
     * @param transitionDuration 转换持续时间（秒）
     */
    public startDayNightTransition(toDayTime: boolean, transitionDuration: number = 2.0): void {
        this._stateData.isTransitioning = true;
        this._stateData.transitionTime = 0;
        
        logger.info(LogCategory.GAME, `开始日夜转换: ${toDayTime ? '夜->日' : '日->夜'}`);
        
        // 触发日夜转换事件
        EventBus.getInstance().emit(EventType.DAY_NIGHT_TRANSITION, {
            toDayTime: toDayTime,
            duration: transitionDuration
        });
        
        // 转换完成后切换状态
        setTimeout(() => {
            this._stateData.isTransitioning = false;
            this.changeState(toDayTime ? GameStateType.TOWER_DEFENSE : GameStateType.ROGUELIKE);
        }, transitionDuration * 1000);
    }
    
    /**
     * 获取当前游戏状态
     */
    public getCurrentState(): GameStateType {
        return this._stateData.currentState;
    }
    
    /**
     * 获取前一个游戏状态
     */
    public getPreviousState(): GameStateType {
        return this._stateData.previousState;
    }
    
    /**
     * 获取游戏模式
     */
    public getGameMode(): GameMode {
        return this._stateData.gameMode;
    }
    
    /**
     * 设置游戏模式
     * @param mode 游戏模式
     */
    public setGameMode(mode: GameMode): void {
        this._stateData.gameMode = mode;
        
        logger.info(LogCategory.GAME, `设置游戏模式: ${GameMode[mode]}`);
        
        // 触发游戏模式变化事件
        EventBus.getInstance().emit(EventType.GAME_MODE_CHANGED, {
            gameMode: mode
        });
    }
    
    /**
     * 获取日数
     */
    public getDayCount(): number {
        return this._stateData.dayCount;
    }
    
    /**
     * 获取夜数
     */
    public getNightCount(): number {
        return this._stateData.nightCount;
    }
    
    /**
     * 是否正在日夜转换
     */
    public isTransitioning(): boolean {
        return this._stateData.isTransitioning;
    }
    
    /**
     * 获取金币数量
     */
    public getGold(): number {
        return this._gameData.gold;
    }
    
    /**
     * 增加金币
     * @param amount 金币数量
     */
    public addGold(amount: number): void {
        if (amount <= 0) {
            return;
        }
        
        this._gameData.gold += amount;
        
        // 触发金币变化事件
        EventBus.getInstance().emit(EventType.GOLD_CHANGED, {
            current: this._gameData.gold,
            added: amount
        });
    }
    
    /**
     * 消费金币
     * @param amount 金币数量
     * @returns 是否消费成功
     */
    public spendGold(amount: number): boolean {
        if (amount <= 0 || this._gameData.gold < amount) {
            return false;
        }
        
        this._gameData.gold -= amount;
        
        // 触发金币变化事件
        EventBus.getInstance().emit(EventType.GOLD_CHANGED, {
            current: this._gameData.gold,
            spent: amount
        });
        
        return true;
    }
    
    /**
     * 获取资源数量
     * @param resourceType 资源类型
     */
    public getResource(resourceType: string): number {
        return this._gameData.resources[resourceType] || 0;
    }
    
    /**
     * 增加资源
     * @param resourceType 资源类型
     * @param amount 资源数量
     */
    public addResource(resourceType: string, amount: number): void {
        if (amount <= 0) {
            return;
        }
        
        if (!this._gameData.resources[resourceType]) {
            this._gameData.resources[resourceType] = 0;
        }
        
        this._gameData.resources[resourceType] += amount;
        
        // 触发资源变化事件
        EventBus.getInstance().emit(EventType.RESOURCE_CHANGED, {
            type: resourceType,
            current: this._gameData.resources[resourceType],
            added: amount
        });
    }
    
    /**
     * 消费资源
     * @param resourceType 资源类型
     * @param amount 资源数量
     * @returns 是否消费成功
     */
    public spendResource(resourceType: string, amount: number): boolean {
        if (amount <= 0) {
            return false;
        }
        
        const currentAmount = this._gameData.resources[resourceType] || 0;
        
        if (currentAmount < amount) {
            return false;
        }
        
        this._gameData.resources[resourceType] -= amount;
        
        // 触发资源变化事件
        EventBus.getInstance().emit(EventType.RESOURCE_CHANGED, {
            type: resourceType,
            current: this._gameData.resources[resourceType],
            spent: amount
        });
        
        return true;
    }
    
    /**
     * 获取玩家等级
     */
    public getPlayerLevel(): number {
        return this._gameData.playerLevel;
    }
    
    /**
     * 获取玩家经验值
     */
    public getPlayerExperience(): number {
        return this._gameData.playerExperience;
    }
    
    /**
     * 增加玩家经验值
     * @param amount 经验值数量
     */
    public addPlayerExperience(amount: number): void {
        if (amount <= 0) {
            return;
        }
        
        this._gameData.playerExperience += amount;
        
        // 检查是否升级
        this._checkLevelUp();
        
        // 触发经验值变化事件
        EventBus.getInstance().emit(EventType.EXPERIENCE_CHANGED, {
            level: this._gameData.playerLevel,
            experience: this._gameData.playerExperience,
            added: amount
        });
    }
    
    /**
     * 检查是否升级
     */
    private _checkLevelUp(): void {
        // 简单的升级公式：下一级所需经验 = 当前等级 * 100
        const nextLevelExp = this._gameData.playerLevel * 100;
        
        if (this._gameData.playerExperience >= nextLevelExp) {
            // 升级
            this._gameData.playerLevel++;
            this._gameData.playerExperience -= nextLevelExp;
            
            logger.info(LogCategory.GAME, `玩家升级: ${this._gameData.playerLevel}`);
            
            // 触发升级事件
            EventBus.getInstance().emit(EventType.PLAYER_LEVEL_UP, {
                level: this._gameData.playerLevel
            });
            
            // 递归检查是否可以继续升级
            this._checkLevelUp();
        }
    }
    
    /**
     * 解锁升级
     * @param upgradeId 升级ID
     */
    public unlockUpgrade(upgradeId: string): boolean {
        if (this._gameData.unlockedUpgrades.indexOf(upgradeId) !== -1) {
            return false;
        }
        
        this._gameData.unlockedUpgrades.push(upgradeId);
        
        logger.info(LogCategory.GAME, `解锁升级: ${upgradeId}`);
        
        // 触发解锁事件
        EventBus.getInstance().emit(EventType.ABILITY_UNLOCKED, {
            type: 'upgrade',
            id: upgradeId
        });
        
        return true;
    }
    
    /**
     * 解锁塔
     * @param towerId 塔ID
     */
    public unlockTower(towerId: string): boolean {
        if (this._gameData.unlockedTowers.indexOf(towerId) !== -1) {
            return false;
        }
        
        this._gameData.unlockedTowers.push(towerId);
        
        logger.info(LogCategory.GAME, `解锁塔: ${towerId}`);
        
        // 触发解锁事件
        EventBus.getInstance().emit(EventType.ABILITY_UNLOCKED, {
            type: 'tower',
            id: towerId
        });
        
        return true;
    }
    
    /**
     * 解锁能力
     * @param abilityId 能力ID
     */
    public unlockAbility(abilityId: string): boolean {
        if (this._gameData.unlockedAbilities.indexOf(abilityId) !== -1) {
            return false;
        }
        
        this._gameData.unlockedAbilities.push(abilityId);
        
        logger.info(LogCategory.GAME, `解锁能力: ${abilityId}`);
        
        // 触发解锁事件
        EventBus.getInstance().emit(EventType.ABILITY_UNLOCKED, {
            type: 'ability',
            id: abilityId
        });
        
        return true;
    }
    
    /**
     * 获取游戏进度
     */
    public getGameProgress(): number {
        return this._gameData.gameProgress;
    }
    
    /**
     * 设置游戏进度
     * @param progress 进度值（0-100）
     */
    public setGameProgress(progress: number): void {
        this._gameData.gameProgress = Math.max(0, Math.min(100, progress));
        
        // 触发进度变化事件
        EventBus.getInstance().emit(EventType.GAME_PROGRESS_CHANGED, {
            progress: this._gameData.gameProgress
        });
    }
    
    /**
     * 重置游戏状态
     */
    public resetState(): void {
        logger.info(LogCategory.GAME, '重置游戏状态');
        this._initState();
    }

    /**
     * 加载游戏状态数据（用于读档）
     * @param data 游戏状态数据
     */
    public loadStateData(data: any): boolean {
        if (!data || !data.stateData || !data.gameData) {
            logger.error(LogCategory.GAME, '加载游戏状态数据失败：数据格式错误');
            return false;
        }
        
        try {
            this._stateData = { ...data.stateData };
            this._gameData = { ...data.gameData };
            
            logger.info(LogCategory.GAME, '加载游戏状态数据成功');
            
            // 触发状态加载事件
            EventBus.getInstance().emit(EventType.GAME_STATE_LOADED, {
                success: true
            });
            
            return true;
        } catch (error) {
            logger.error(LogCategory.GAME, '加载游戏状态数据失败', error);
            return false;
        }
    }

    // 单例实例
    private static instance: GameState = null;
    
    private _currentState: GameStateType = GameStateType.NONE;
    private _previousState: GameStateType = GameStateType.NONE;
    private _gameMode: GameMode = GameMode.NORMAL;
    private _dayCount: number = 1;
    private _nightCount: number = 0;
    private _isTransitioning: boolean = false;
    private _transitionTime: number = 0;
    
    // 状态转换回调
    private _stateChangeCallbacks: Map<GameStateType, Function[]> = new Map();
    private _stateEnterCallbacks: Map<GameStateType, Function[]> = new Map();
    private _stateExitCallbacks: Map<GameStateType, Function[]> = new Map();
    
    /**
     * 增加天数
     */
    public incrementDay(): void {
        this._dayCount++;
        console.log(`进入第 ${this._dayCount} 天`);
    }
    
    /**
     * 增加夜数
     */
    public incrementNight(): void {
        this._nightCount++;
        console.log(`进入第 ${this._nightCount} 夜`);
    }
    
    /**
     * 切换游戏状态
     * @param newState 新状态
     * @param immediate 是否立即切换（跳过转换动画）
     */
    public changeState(newState: GameStateType, immediate: boolean = false): void {
        if (this._currentState === newState) {
            console.warn(`状态已经是 ${GameStateType[newState]}`);
            return;
        }
        
        if (this._isTransitioning && !immediate) {
            console.warn("正在转换状态中，请等待完成");
            return;
        }
        
        console.log(`状态转换: ${GameStateType[this._currentState]} -> ${GameStateType[newState]}`);
        
        // 触发退出回调
        this.triggerExitCallbacks(this._currentState);
        
        // 更新状态
        this._previousState = this._currentState;
        this._currentState = newState;
        
        // 触发状态变化回调
        this.triggerStateChangeCallbacks(newState);
        
        // 触发进入回调
        this.triggerEnterCallbacks(newState);
        
        // 开始转换
        if (!immediate) {
            this.startTransition();
        }
    }
    
    /**
     * 开始状态转换
     */
    private startTransition(): void {
        this._isTransitioning = true;
        this._transitionTime = 0;
        
        // 这里可以添加转换动画逻辑
        console.log("开始状态转换动画");
        
        // 模拟转换完成
        setTimeout(() => {
            this._isTransitioning = false;
            console.log("状态转换完成");
        }, 500);
    }
    
    /**
     * 注册状态变化回调
     */
    public onStateChange(state: GameStateType, callback: Function): void {
        if (!this._stateChangeCallbacks.has(state)) {
            this._stateChangeCallbacks.set(state, []);
        }
        this._stateChangeCallbacks.get(state)!.push(callback);
    }
    
    /**
     * 注册状态进入回调
     */
    public onStateEnter(state: GameStateType, callback: Function): void {
        if (!this._stateEnterCallbacks.has(state)) {
            this._stateEnterCallbacks.set(state, []);
        }
        this._stateEnterCallbacks.get(state)!.push(callback);
    }
    
    /**
     * 注册状态退出回调
     */
    public onStateExit(state: GameStateType, callback: Function): void {
        if (!this._stateExitCallbacks.has(state)) {
            this._stateExitCallbacks.set(state, []);
        }
        this._stateExitCallbacks.get(state)!.push(callback);
    }
    
    /**
     * 触发状态变化回调
     */
    private triggerStateChangeCallbacks(state: GameStateType): void {
        const callbacks = this._stateChangeCallbacks.get(state);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(state, this._previousState);
                } catch (error) {
                    console.error(`状态变化回调执行失败:`, error);
                }
            });
        }
    }
    
    /**
     * 触发状态进入回调
     */
    private triggerEnterCallbacks(state: GameStateType): void {
        const callbacks = this._stateEnterCallbacks.get(state);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(state);
                } catch (error) {
                    console.error(`状态进入回调执行失败:`, error);
                }
            });
        }
    }
    
    /**
     * 触发状态退出回调
     */
    private triggerExitCallbacks(state: GameStateType): void {
        const callbacks = this._stateExitCallbacks.get(state);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(state);
                } catch (error) {
                    console.error(`状态退出回调执行失败:`, error);
                }
            });
        }
    }
    
    /**
     * 检查是否为塔防模式
     */
    public isTowerDefenseMode(): boolean {
        return this._currentState === GameStateType.TOWER_DEFENSE;
    }
    
    /**
     * 检查是否为肉鸽模式
     */
    public isRoguelikeMode(): boolean {
        return this._currentState === GameStateType.ROGUELIKE;
    }
    
    /**
     * 检查是否为菜单状态
     */
    public isMenuState(): boolean {
        return this._currentState === GameStateType.MAIN_MENU || 
               this._currentState === GameStateType.SETTINGS ||
               this._currentState === GameStateType.INVENTORY ||
               this._currentState === GameStateType.UPGRADE;
    }
    
    /**
     * 获取状态数据
     */
    public getStateData(): IGameStateData {
        return {
            currentState: this._currentState,
            previousState: this._previousState,
            gameMode: this._gameMode,
            dayCount: this._dayCount,
            nightCount: this._nightCount,
            isTransitioning: this._isTransitioning,
            transitionTime: this._transitionTime
        };
    }
    
    /**
     * 重置状态
     */
    public reset(): void {
        this._currentState = GameStateType.NONE;
        this._previousState = GameStateType.NONE;
        this._dayCount = 1;
        this._nightCount = 0;
        this._isTransitioning = false;
        this._transitionTime = 0;
        
        // 清空回调
        this._stateChangeCallbacks.clear();
        this._stateEnterCallbacks.clear();
        this._stateExitCallbacks.clear();
        
        console.log("游戏状态已重置");
    }
}