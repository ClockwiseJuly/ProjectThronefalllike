import { _decorator, Component, Node, director, Scene, instantiate, Prefab, AssetManager, SceneAsset, game, sys } from 'cc';
import { GameState, GameStateType } from './GameState';
import { EventBus, EventType } from './EventBus';
import { logger, LogCategory } from './Logger';
import { resourceManager } from './ResourceManager';
const { ccclass, property } = _decorator;

/**
 * 场景类型枚举
 */
export enum SceneType {
    NONE = 0,
    MENU = 1,        // 主菜单场景
    TOWER_DEFENSE = 2, // 塔防场景（日间）
    ROGUELIKE = 3,   // 肉鸽场景（夜间）
    LOADING = 4,     // 加载场景
    SETTINGS = 5,    // 设置场景
    INVENTORY = 6,   // 物品栏场景
    UPGRADE = 7      // 升级场景
}

/**
 * 场景加载状态
 */
export enum SceneLoadingStatus {
    NONE = 0,      // 未加载
    LOADING = 1,   // 加载中
    COMPLETED = 2, // 加载完成
    FAILED = 3     // 加载失败
}

/**
 * 场景信息接口
 */
export interface ISceneInfo {
    name: string;           // 场景名称
    path: string;           // 场景资源路径
    type: SceneType;        // 场景类型
    preloadResources?: string[]; // 预加载资源列表
    data?: any;             // 场景数据
}

/**
 * 场景管理器
 * 负责场景的加载、切换和预加载管理
 */
@ccclass('SceneManager')
export class SceneManager {
    private static _instance: SceneManager = null;
    
    // 场景信息映射表
    private _sceneInfoMap: Map<string, ISceneInfo> = new Map();
    // 当前场景信息
    private _currentScene: ISceneInfo = null;
    // 上一个场景信息
    private _previousScene: ISceneInfo = null;
    // 场景加载状态
    private _loadingStatus: SceneLoadingStatus = SceneLoadingStatus.NONE;
    // 加载进度
    private _loadingProgress: number = 0;
    // 场景预加载队列
    private _preloadQueue: SceneType[] = [];
    // 是否正在预加载
    private _isPreloading: boolean = false;
    // 场景信息映射表（按场景类型索引）
    private _sceneInfos: Map<SceneType, any> = new Map();
    
    /**
     * 获取单例实例
     */
    public static getInstance(): SceneManager {
        if (!SceneManager._instance) {
            SceneManager._instance = new SceneManager();
        }
        return SceneManager._instance;
    }
    
    /**
     * 构造函数
     */
    constructor() {
        if (SceneManager._instance) {
            logger.warn('SCENE', '尝试创建多个SceneManager实例，已使用现有实例');
            return SceneManager._instance;
        }
        
        SceneManager._instance = this;
        this._initSceneInfoMap();
        this._registerEvents();
        logger.info('SCENE', '场景管理器初始化完成');
    }
    
    /**
     * 初始化场景信息映射表
     */
    private _initSceneInfoMap(): void {
        // 注册主菜单场景
        this.registerScene({
            name: 'MainMenu',
            path: 'scenes/MainMenu',
            type: SceneType.MENU,
            preloadResources: ['prefabs/ui/MainMenuUI'],
            data: {}
        });
        
        // 注册日间塔防场景
        this.registerScene({
            name: 'TowerDefense',
            path: 'scenes/TowerDefense',
            type: SceneType.TOWER_DEFENSE,
            preloadResources: [
                'prefabs/towers/BasicTower',
                'prefabs/enemies/BasicEnemy',
                'prefabs/ui/TowerDefenseUI'
            ],
            data: {}
        });
        
        // 注册夜间肉鸽场景
        this.registerScene({
            name: 'Roguelike',
            path: 'scenes/Roguelike',
            type: SceneType.ROGUELIKE,
            preloadResources: [
                'prefabs/player/Player',
                'prefabs/enemies/RogueEnemy',
                'prefabs/items/Weapon',
                'prefabs/ui/RoguelikeUI'
            ],
            data: {}
        });
        
        // 注册加载场景
        this.registerScene({
            name: 'Loading',
            path: 'scenes/Loading',
            type: SceneType.LOADING,
            preloadResources: ['prefabs/ui/LoadingUI'],
            data: {}
        });
    }
    
    /**
     * 注册事件监听
     */
    private _registerEvents(): void {
        // 监听场景加载完成事件
        director.on(EventType.EVENT_AFTER_SCENE_LAUNCH, this._onSceneLaunched);
        
        // 监听游戏状态变化事件
        EventBus.getInstance().on(EventType.GAME_STATE_CHANGED, this._onGameStateChanged);
        
        // 监听日夜转换事件
        EventBus.getInstance().on(EventType.DAY_NIGHT_TRANSITION, this._onDayNightTransition);
    }
    
    /**
     * 场景加载完成回调
     */
    private _onSceneLaunched(scene: Scene): void {
        if (!this._currentScene) {
            return;
        }
        
        this._loadingStatus = SceneLoadingStatus.COMPLETED;
        this._loadingProgress = 1;
        
        logger.info('SCENE', `场景加载完成: ${this._currentScene.name}`);
        
        // 触发场景加载完成事件
        EventBus.getInstance().emit(EventType.SCENE_LOADED, {
            sceneName: this._currentScene.name,
            sceneType: this._currentScene.type
        });
    }
    
    /**
     * 游戏状态变化回调
     */
    private _onGameStateChanged(data: any): void {
        // 根据游戏状态切换相应场景
        switch (data.currentState) {
            case GameStateType.TOWER_DEFENSE:
                if (this._currentScene && this._currentScene.type !== SceneType.TOWER_DEFENSE) {
                    this.loadScene('TowerDefense');
                }
                break;
            case GameStateType.ROGUELIKE:
                if (this._currentScene && this._currentScene.type !== SceneType.ROGUELIKE) {
                    this.loadScene('Roguelike');
                }
                break;
            case GameStateType.MAIN_MENU:
                if (this._currentScene && this._currentScene.type !== SceneType.MENU) {
                    this.loadScene('MainMenu');
                }
                break;
        }
    }
    
    /**
     * 日夜转换回调
     */
    private _onDayNightTransition(data: any): void {
        // 在日夜转换期间可以执行一些特殊效果
        logger.info('SCENE', `日夜转换: ${data.toDayTime ? '夜->日' : '日->夜'}`);
    }
            /**
     * 注册场景信息
     * @param sceneInfo 场景信息
     */
    public registerScene(sceneInfo: ISceneInfo): void {
        if (this._sceneInfoMap.has(sceneInfo.name)) {
            logger.warn('SCENE', `场景已注册: ${sceneInfo.name}`);
            return;
        }
        
        this._sceneInfoMap.set(sceneInfo.name, sceneInfo);
        this._sceneInfos.set(sceneInfo.type, sceneInfo);
        logger.info('SCENE', `注册场景: ${sceneInfo.name}`);
    }
    
    /**
     * 获取场景信息
     * @param sceneName 场景名称
     */
    public getSceneInfo(sceneName: string): ISceneInfo {
        return this._sceneInfoMap.get(sceneName);
    }
    
    /**
     * 获取当前场景信息
     */
    public getCurrentScene(): ISceneInfo {
        return this._currentScene;
    }
    
    /**
     * 获取上一个场景信息
     */
    public getPreviousScene(): ISceneInfo {
        return this._previousScene;
    }
    
    /**
     * 获取场景加载状态
     */
    public getLoadingStatus(): SceneLoadingStatus {
        return this._loadingStatus;
    }
    
    /**
     * 获取加载进度
     */
    public getLoadingProgress(): number {
        return this._loadingProgress;
    }
    
    /**
     * 加载场景
     * @param sceneName 场景名称
     * @param params 场景参数
     */
    public loadScene(sceneName: string, params?: any): void {
        const sceneInfo = this._sceneInfoMap.get(sceneName);
        
        if (!sceneInfo) {
            logger.error('SCENE', `场景不存在: ${sceneName}`);
            return;
        }
        
        // 如果当前正在加载场景，则忽略
        if (this._loadingStatus === SceneLoadingStatus.LOADING) {
            logger.warn('SCENE', `场景正在加载中，忽略加载请求: ${sceneName}`);
            return;
        }
        
        // 保存上一个场景信息
        this._previousScene = this._currentScene;
        // 更新当前场景信息
        this._currentScene = sceneInfo;
        
        // 更新场景数据
        if (params) {
            this._currentScene.data = { ...this._currentScene.data, ...params };
        }
        
        logger.info('SCENE', `开始加载场景: ${sceneName}`);
        
        // 更新加载状态
        this._loadingStatus = SceneLoadingStatus.LOADING;
        this._loadingProgress = 0;
        
        // 触发场景开始加载事件
        EventBus.getInstance().emit(EventType.SCENE_LOADING, {
            sceneName: sceneName,
            sceneType: sceneInfo.type
        });
        
        // 如果有预加载资源，先加载资源再加载场景
        if (sceneInfo.preloadResources && sceneInfo.preloadResources.length > 0) {
            this._preloadSceneResources(sceneInfo, () => {
                director.loadScene(sceneInfo.path);
            });
        } else {
            // 直接加载场景
            director.loadScene(sceneInfo.path);
        }
    }
    
    /**
     * 预加载场景资源
     * @param sceneInfo 场景信息
     * @param callback 完成回调
     */
    private _preloadSceneResources(sceneInfo: ISceneInfo, callback: () => void): void {
        const resources = sceneInfo.preloadResources;
        let loadedCount = 0;
        
        logger.info('SCENE', `预加载场景资源: ${sceneInfo.name}, 资源数: ${resources.length}`);
        
        // 遍历预加载资源
        resources.forEach(path => {
            resourceManager.loadAsset(path, null, 'resources', null, (err, asset) => {
                loadedCount++;
                
                // 更新加载进度
                this._loadingProgress = loadedCount / resources.length * 0.5; // 资源加载占总进度的50%
                
                // 触发加载进度事件
                EventBus.getInstance().emit(EventType.SCENE_LOADING_PROGRESS, {
                    progress: this._loadingProgress,
                    sceneName: sceneInfo.name
                });
                
                // 所有资源加载完成后执行回调
                if (loadedCount === resources.length) {
                    callback();
                }
            });
        });
    }

    /**
     * 处理预加载队列
     * @param sceneName 场景名称
     */
    private _processPreloadQueue(): void {
        if (this._preloadQueue.length === 0) {
            this._isPreloading = false;
            return;
        }
        
        this._isPreloading = true;
        
        // 取出队列中的第一个场景
        const sceneName = this._preloadQueue.shift();
        const sceneInfo = this._sceneInfoMap.get(sceneName.toString());
        
        logger.info('SCENE', `开始预加载场景: ${sceneName}`);
        
        // 预加载场景资源
        if (sceneInfo.preloadResources && sceneInfo.preloadResources.length > 0) {
            let loadedCount = 0;
            
            // 遍历预加载资源
            sceneInfo.preloadResources.forEach(path => {
                resourceManager.loadAsset(path, null, 'resources', null, (err, asset) => {
                    loadedCount++;
                    
                    // 所有资源加载完成后预加载场景
                    if (loadedCount === sceneInfo.preloadResources.length) {
                        // 预加载场景
                        director.preloadScene(sceneInfo.path, (err) => {
                            if (err) {
                                logger.error('SCENE', `场景预加载失败: ${sceneName}`, err);
                            } else {
                                logger.info('SCENE', `场景预加载完成: ${sceneName}`);
                            }
                            
                            // 继续处理队列中的下一个场景
                            this._processPreloadQueue();
                        });
                    }
                });
            });
        } else {
            // 直接预加载场景
            director.preloadScene(sceneInfo.path, (err) => {
                if (err) {
                    logger.error('SCENE', `场景预加载失败: ${sceneName}`, err);
                } else {
                    logger.info('SCENE', `场景预加载完成: ${sceneName}`);
                }
                
                // 继续处理队列中的下一个场景
                this._processPreloadQueue();
            });
        }
    }
    
    /**
     * 返回上一个场景
     */
    public backToPreviousScene(): void {
        if (!this._previousScene) {
            logger.warn('SCENE', '没有上一个场景记录');
            return;
        }
        
        this.loadScene(this._previousScene.name);
    }
    
    /**
     * 重新加载当前场景
     */
    public reloadCurrentScene(): void {
        if (!this._currentScene) {
            logger.warn('SCENE', '当前没有加载的场景');
            return;
        }
        
        this.loadScene(this._currentScene.name);
    }
    
    /**
     * 生成肉鸽地牢场景
     * @param dungeonLevel 地牢等级
     * @param dungeonSize 地牢大小
     */
    public generateRoguelikeDungeon(dungeonLevel: number, dungeonSize: number): void {
        logger.info('SCENE', `生成肉鸽地牢: 等级=${dungeonLevel}, 大小=${dungeonSize}`);
        
        // 设置肉鸽场景参数
        const dungeonParams = {
            level: dungeonLevel,
            size: dungeonSize,
            seed: Math.floor(Math.random() * 1000000), // 随机种子
            generatedTime: Date.now()
        };
        
        // 加载肉鸽场景
        this.loadScene('Roguelike', dungeonParams);
    }
    
    /**
     * 生成塔防场景
     * @param level 关卡等级
     * @param difficulty 难度系数
     */
    public generateTowerDefenseLevel(level: number, difficulty: number): void {
        logger.info('SCENE', `生成塔防关卡: 等级=${level}, 难度=${difficulty}`);
        
        // 设置塔防场景参数
        const levelParams = {
            level: level,
            difficulty: difficulty,
            seed: Math.floor(Math.random() * 1000000), // 随机种子
            generatedTime: Date.now()
        };
        
        // 加载塔防场景
        this.loadScene('TowerDefense', levelParams);
    }
    
    /**
     * 销毁场景管理器
     */
    public destroy(): void {
        // 移除事件监听
        EventBus.getInstance().off(EventType.EVENT_AFTER_SCENE_LAUNCH, this._onSceneLaunched);
        EventBus.getInstance().off(EventType.GAME_STATE_CHANGED, this._onGameStateChanged);
        EventBus.getInstance().off(EventType.DAY_NIGHT_TRANSITION, this._onDayNightTransition);
        
        // 清空场景信息
        this._sceneInfoMap.clear();
        this._currentScene = null;
        this._previousScene = null;
        
        // 重置状态
        this._loadingStatus = SceneLoadingStatus.NONE;
        this._loadingProgress = 0;
        this._preloadQueue = [];
        this._isPreloading = false;
        
        // 清空单例
        SceneManager._instance = null;
    }

    /**
     * 初始化场景信息
     */
    private initSceneInfos(): void {
        const sceneInfos = [
            {
                sceneType: SceneType.INVENTORY,
                sceneName: "Inventory",
                isLoaded: false,
                loadState: SceneLoadingStatus.NONE,
                preloadAssets: ["UI/Inventory", "Items"]
            },
            {
                sceneType: SceneType.UPGRADE,
                sceneName: "Upgrade",
                isLoaded: false,
                loadState: SceneLoadingStatus.NONE,
                preloadAssets: ["UI/Upgrade", "Items"]
            }
        ];
        
        sceneInfos.forEach(info => {
            this._sceneInfos.set(info.sceneType, info);
        });
    }
    
    /**
     * 开始预加载
     */
    private startPreloading(): void {
        // 添加重要场景到预加载队列
        this._preloadQueue.push(SceneType.MENU);
        this._preloadQueue.push(SceneType.TOWER_DEFENSE);
        this._preloadQueue.push(SceneType.ROGUELIKE);
        
        this._processPreloadQueue();
    }
    
    /**
     * 预加载场景
     */
    private async preloadScene(sceneType: SceneType): Promise<void> {
        const sceneInfo = this._sceneInfos.get(sceneType);
        if (!sceneInfo) {
            console.error(`场景信息不存在: ${sceneType}`);
            return;
        }
        
        if (sceneInfo.isLoaded) {
            console.log(`场景已加载: ${sceneType}`);
            return;
        }
        
        console.log(`预加载场景: ${sceneType}`);
        
        try {
            // 预加载资源
            await this.preloadAssets(sceneInfo.preloadAssets);
            
            // 标记为已预加载
            sceneInfo.loadState = SceneLoadingStatus.COMPLETED;
            sceneInfo.isLoaded = true;
            
            console.log(`场景预加载完成: ${sceneType}`);
        } catch (error) {
            console.error(`场景预加载失败: ${sceneType}`, error);
            sceneInfo.loadState = SceneLoadingStatus.FAILED;
        }
    }
    
    /**
     * 预加载资源
     */
    private async preloadAssets(assetPaths: string[]): Promise<void> {
        // 这里实现资源预加载逻辑
        // 在Cocos Creator中，通常使用resources.load或assetManager.loadBundle
        for (const path of assetPaths) {
            console.log(`预加载资源: ${path}`);
            // 模拟异步加载
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    /**
     * 显示加载场景
     */
    private async showLoadingScene(): Promise<void> {
        console.log("显示加载界面");
        // 这里实现加载界面的显示逻辑
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    /**
     * 卸载当前场景
     */
    private async unloadCurrentScene(): Promise<void> {
        console.log(`卸载当前场景: ${this._currentScene}`);
        // 这里实现场景卸载逻辑
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    /**
     * 加载新场景
     */
    private async loadNewScene(sceneType: SceneType): Promise<void> {
        const sceneInfo = this._sceneInfos.get(sceneType);
        if (!sceneInfo) {
            throw new Error(`场景信息不存在: ${sceneType}`);
        }
        
        console.log(`加载新场景: ${sceneType}`);
        
        // 如果场景已预加载，直接使用
        if (sceneInfo.isLoaded) {
            console.log(`使用预加载的场景: ${sceneType}`);
            return;
        }
        
        // 否则动态加载场景
        try {
            // 在Cocos Creator中，使用director.loadScene加载场景
            await new Promise<void>((resolve, reject) => {
                director.loadScene(sceneInfo.sceneName, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
            
            sceneInfo.isLoaded = true;
            sceneInfo.loadState = SceneLoadingStatus.COMPLETED;
        } catch (error) {
            sceneInfo.loadState = SceneLoadingStatus.FAILED;
            throw error;
        }
    }
    
    /**
     * 检查场景是否已加载
     */
    public isSceneLoaded(sceneType: SceneType): boolean {
        const sceneInfo = this._sceneInfos.get(sceneType);
        return sceneInfo ? sceneInfo.isLoaded : false;
    }
    
    /**
     * 检查是否正在加载
     */
    public isLoading(): boolean {
        return this._loadingStatus === SceneLoadingStatus.LOADING;
    }
    
    /**
     * 添加场景到预加载队列
     */
    public addToPreloadQueue(sceneType: SceneType): void {
        if (this._preloadQueue.indexOf(sceneType) === -1) {
            this._preloadQueue.push(sceneType);
            this._processPreloadQueue();
        }
    }
    
    /**
     * 清理场景缓存
     */
    public clearSceneCache(): void {
        this._sceneInfoMap.clear();
        this._sceneInfos.clear();
        console.log("场景缓存已清理");
    }
    
    onDestroy() {
        if (SceneManager._instance === this) {
            SceneManager._instance = null;
        }
    }
}