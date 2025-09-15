import { _decorator, Component, Node, director, game, sys } from 'cc';
import { EventBus, EventType } from './EventBus';
import { logger, LogCategory } from './Logger';
import { resourceManager } from './ResourceManager';
import { SceneManager } from './SceneManager';
import { GameState, GameStateType } from './GameState';
const { ccclass, property } = _decorator;

/**
 * 游戏主管理器
 * 负责整个游戏的生命周期管理和各个系统之间的协调
 * 采用单例模式，确保全局唯一性
 */
@ccclass('GameManager')
export class GameManager extends Component {
    private static _instance: GameManager = null;
    
    @property(Node)
    public gameRoot: Node = null; // 游戏根节点
    
    @property(Node)
    public uiRoot: Node = null; // UI根节点
    
    @property(Node)
    public effectRoot: Node = null; // 特效根节点
    
    // 游戏状态
    private _isInitialized: boolean = false;
    private _isPaused: boolean = false;
    private _gameTime: number = 0;
    
    // 游戏系统引用
    private _sceneManager: SceneManager = null;
    private _uiManager: any = null;
    private _audioManager: any = null;
    private _saveSystem: any = null;
    private _towerDefenseSystem: any = null;
    private _roguelikeSystem: any = null;
    private _enemySystem: any = null;
    private _itemSystem: any = null;
    private _gameState: GameState = null;
    
    /**
     * 获取单例实例
     */
    public static getInstance(): GameManager {
        return GameManager._instance;
    }
    
    onLoad() {
        // 确保单例
        if (GameManager._instance === null) {
            GameManager._instance = this;
            // 防止场景切换时销毁
            game.addPersistRootNode(this.node);
            this.initializeGame();
        } else {
            logger.warn(LogCategory.GAME, '尝试创建多个GameManager实例，已使用现有实例');
            this.node.destroy();
        }
    }
    
    /**
     * 初始化游戏
     * 负责初始化各个系统和管理器
     */
    private initializeGame(): void {
        if (this._isInitialized) {
            return;
        }
        
        logger.info(LogCategory.GAME, '开始初始化游戏...');
        
        // 初始化事件总线
        const eventBus = EventBus.getInstance();
        
        // 初始化资源管理器
        resourceManager.setAutoRelease(true, 300);
        
        // 初始化游戏状态
        this._gameState = new GameState();
        
        // 初始化场景管理器
        this._sceneManager = this.getComponent(SceneManager) || this.addComponent(SceneManager);
        
        // 注册游戏事件监听
        this._registerEvents();
        
        // 标记初始化完成
        this._isInitialized = true;
        
        logger.info(LogCategory.GAME, '游戏初始化完成');
        
        // 触发游戏初始化完成事件
        eventBus.emit(EventType.GAME_START, { initialStart: true });
    }
    
    /**
     * 注册游戏事件监听
     */
    private _registerEvents(): void {
        const eventBus = EventBus.getInstance();
        
        // 监听游戏暂停事件
        eventBus.on(EventType.GAME_PAUSE, () => {
            this.pauseGame();
        });
        
        // 监听游戏恢复事件
        eventBus.on(EventType.GAME_RESUME, () => {
            this.resumeGame();
        });
        
        // 监听游戏结束事件
        eventBus.on(EventType.GAME_OVER, (data) => {
            this.gameOver(data);
        });
        
        // 监听日夜转换事件
        eventBus.on(EventType.DAY_NIGHT_TRANSITION, (data) => {
            this.handleDayNightTransition(data);
        });
        
        logger.info(LogCategory.GAME, '游戏事件监听注册完成');
    }
    
    /**
     * 开始游戏
     */
    public startGame(): void {
        logger.info(LogCategory.GAME, '开始游戏');
        
        // 重置游戏状态
        this._gameTime = 0;
        this._isPaused = false;
        
        // 触发游戏开始事件
        EventBus.getInstance().emit(EventType.GAME_START, { restart: false });
        
        // 加载主场景
        this._sceneManager.loadScene(GameStateType.TOWER_DEFENSE);
    }
    
    /**
     * 暂停游戏
     */
    public pauseGame(): void {
        if (this._isPaused) {
            return;
        }
        
        logger.info(LogCategory.GAME, '暂停游戏');
        
        this._isPaused = true;
        game.pause();
        
        // 触发游戏暂停事件
        EventBus.getInstance().emit(EventType.GAME_PAUSE, {});
    }
    
    /**
     * 恢复游戏
     */
    public resumeGame(): void {
        if (!this._isPaused) {
            return;
        }
        
        logger.info(LogCategory.GAME, '恢复游戏');
        
        this._isPaused = false;
        game.resume();
        
        // 触发游戏恢复事件
        EventBus.getInstance().emit(EventType.GAME_RESUME, {});
    }
    
    /**
     * 游戏结束
     */
    public gameOver(data: any): void {
        logger.info(LogCategory.GAME, '游戏结束', data);
        
        // 触发游戏结束事件
        EventBus.getInstance().emit(EventType.GAME_OVER, data);
    }
    
    /**
     * 处理日夜转换
     */
    public handleDayNightTransition(data: any): void {
        logger.info(LogCategory.GAME, '日夜转换', data);
        
        // 根据当前状态切换到日间或夜间模式
        if (data.toDayTime) {
            // 切换到日间模式（塔防）
            EventBus.getInstance().emit(EventType.DAY_START, data);
        } else {
            // 切换到夜间模式（肉鸽）
            EventBus.getInstance().emit(EventType.NIGHT_START, data);
        }
    }
    
    /**
     * 获取游戏时间
     */
    public getGameTime(): number {
        return this._gameTime;
    }
    
    /**
     * 获取游戏状态
     */
    public getGameState(): GameState {
        return this._gameState;
    }
    
    /**
     * 获取场景管理器
     */
    public getSceneManager(): SceneManager {
        return this._sceneManager;
    }
    
    /**
     * 游戏更新
     */
    update(dt: number) {
        if (this._isPaused) {
            return;
        }
        
        // 更新游戏时间
        this._gameTime += dt;
    }
    
    /**
     * 初始化游戏
     */
    private async initializeGame(): Promise<void> {
        if (this._isInitialized) return;
        
        console.log("游戏初始化开始...");
        
        try {
            // 初始化各个系统
            await this.initializeSystems();
            
            // 设置游戏循环
            this.setupGameLoop();
            
            this._isInitialized = true;
            console.log("游戏初始化完成");
            
            // 启动主菜单
            this.startMainMenu();
            
        } catch (error) {
            console.error("游戏初始化失败:", error);
        }
    }
    
    /**
     * 初始化各个游戏系统
     */
    private async initializeSystems(): Promise<void> {
        // 这里将在后续步骤中实现各个系统的初始化
        console.log("正在初始化游戏系统...");
        
        // 模拟异步初始化
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    /**
     * 设置游戏循环
     */
    private setupGameLoop(): void {
        // 注册游戏循环更新
        this.schedule(this.update, 0.016); // 约60FPS
    }
    
    /**
     * 游戏主循环更新
     */
    private update(deltaTime: number): void {
        if (this._isPaused) return;
        
        this._gameTime += deltaTime;
        
        // 更新各个系统
        this.updateSystems(deltaTime);
    }
    
    /**
     * 更新各个系统
     */
    private updateSystems(deltaTime: number): void {
        // 这里将在后续步骤中实现各个系统的更新
    }
    
    /**
     * 启动主菜单
     */
    private startMainMenu(): void {
        console.log("启动主菜单");
        // 这里将在后续步骤中实现主菜单逻辑
    }
    
    /**
     * 暂停游戏
     */
    public pauseGame(): void {
        this._isPaused = true;
        director.pause();
        console.log("游戏已暂停");
    }
    
    /**
     * 恢复游戏
     */
    public resumeGame(): void {
        this._isPaused = false;
        director.resume();
        console.log("游戏已恢复");
    }
    
    /**
     * 获取游戏时间
     */
    public getGameTime(): number {
        return this._gameTime;
    }
    
    /**
     * 获取是否已暂停
     */
    public isPaused(): boolean {
        return this._isPaused;
    }
    
    /**
     * 获取是否已初始化
     */
    public isInitialized(): boolean {
        return this._isInitialized;
    }
    
    onDestroy() {
        if (GameManager._instance === this) {
            GameManager._instance = null;
        }
    }
}
