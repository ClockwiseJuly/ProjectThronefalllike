import { _decorator, Component, Node, Canvas, Widget, UITransform, instantiate, Prefab } from 'cc';
import { GameState, GameStateType } from '../Core/GameState';
const { ccclass, property } = _decorator;

/**
 * UI层级枚举
 */
export enum UILayer {
    BACKGROUND = 0,     // 背景层
    NORMAL = 1,         // 普通层
    DIALOG = 2,         // 对话框层
    POPUP = 3,          // 弹窗层
    LOADING = 4,        // 加载层
    TOP = 5,            // 顶层
}

/**
 * UI类型枚举
 */
export enum UIType {
    MAIN_MENU = "MainMenu",
    GAME_HUD = "GameHUD",
    TOWER_DEFENSE_HUD = "TowerDefenseHUD",
    ROGUELIKE_HUD = "RoguelikeHUD",
    INVENTORY = "Inventory",
    UPGRADE = "Upgrade",
    SETTINGS = "Settings",
    PAUSE_MENU = "PauseMenu",
    GAME_OVER = "GameOver",
    VICTORY = "Victory",
    LOADING = "Loading",
    DIALOG = "Dialog",
    NOTIFICATION = "Notification",
}

/**
 * UI状态枚举
 */
export enum UIState {
    HIDDEN = 0,         // 隐藏
    SHOWING = 1,        // 显示中
    VISIBLE = 2,        // 可见
    HIDING = 3,         // 隐藏中
}

/**
 * UI数据接口
 */
export interface IUIData {
    uiType: UIType;
    layer: UILayer;
    state: UIState;
    node: Node;
    isModal: boolean;   // 是否为模态UI
    isPersistent: boolean; // 是否持久化
    priority: number;   // 优先级
}

/**
 * UI管理器
 * 负责UI的显示、隐藏、层级管理等
 */
@ccclass('UIManager')
export class UIManager extends Component {
    private static _instance: UIManager = null;
    
    @property(Canvas)
    public canvas: Canvas = null; // 主画布
    
    @property(Node)
    public backgroundLayer: Node = null; // 背景层
    
    @property(Node)
    public normalLayer: Node = null; // 普通层
    
    @property(Node)
    public dialogLayer: Node = null; // 对话框层
    
    @property(Node)
    public popupLayer: Node = null; // 弹窗层
    
    @property(Node)
    public loadingLayer: Node = null; // 加载层
    
    @property(Node)
    public topLayer: Node = null; // 顶层
    
    @property([Prefab])
    public uiPrefabs: Prefab[] = []; // UI预制体数组
    
    // UI管理
    private _uiMap: Map<UIType, IUIData> = new Map();
    private _uiStack: UIType[] = []; // UI显示栈
    private _modalStack: UIType[] = []; // 模态UI栈
    
    // 游戏状态
    private _isInitialized: boolean = false;
    private _currentGameUI: UIType = null;
    
    /**
     * 获取单例实例
     */
    public static getInstance(): UIManager {
        return UIManager._instance;
    }
    
    onLoad() {
        if (UIManager._instance === null) {
            UIManager._instance = this;
            this.initializeUIManager();
        } else {
            this.node.destroy();
        }
    }
    
    /**
     * 初始化UI管理器
     */
    private initializeUIManager(): void {
        console.log("UI管理器初始化");
        
        // 初始化UI层级
        this.initializeUILayers();
        
        // 注册游戏状态监听
        const gameState = GameState.getInstance();
        gameState.onStateChange(GameStateType.MAIN_MENU, () => {
            this.showMainMenu();
        });
        
        gameState.onStateChange(GameStateType.TOWER_DEFENSE, () => {
            this.showTowerDefenseHUD();
        });
        
        gameState.onStateChange(GameStateType.ROGUELIKE, () => {
            this.showRoguelikeHUD();
        });
        
        gameState.onStateChange(GameStateType.PAUSED, () => {
            this.showPauseMenu();
        });
        
        this._isInitialized = true;
        console.log("UI管理器初始化完成");
    }
    
    /**
     * 初始化UI层级
     */
    private initializeUILayers(): void {
        // 设置层级顺序
        const layers = [
            this.backgroundLayer,
            this.normalLayer,
            this.dialogLayer,
            this.popupLayer,
            this.loadingLayer,
            this.topLayer
        ];
        
        layers.forEach((layer, index) => {
            if (layer) {
                layer.setSiblingIndex(index);
            }
        });
    }
    
    /**
     * 显示UI
     */
    public showUI(uiType: UIType, layer?: UILayer, isModal: boolean = false, isPersistent: boolean = false): boolean {
        if (!this._isInitialized) {
            console.warn("UI管理器未初始化");
            return false;
        }
        
        // 检查UI是否已存在
        let uiData = this._uiMap.get(uiType);
        if (uiData) {
            if (uiData.state === UIState.VISIBLE) {
                console.log(`UI已显示: ${uiType}`);
                return true;
            }
            // 如果UI存在但未显示，直接显示
            return this.showExistingUI(uiData);
        }
        
        // 创建新UI
        uiData = this.createUI(uiType, layer, isModal, isPersistent);
        if (!uiData) {
            return false;
        }
        
        // 显示UI
        return this.showExistingUI(uiData);
    }
    
    /**
     * 创建UI
     */
    private createUI(uiType: UIType, layer?: UILayer, isModal: boolean = false, isPersistent: boolean = false): IUIData | null {
        // 查找UI预制体
        const prefab = this.findUIPrefab(uiType);
        if (!prefab) {
            console.error(`UI预制体不存在: ${uiType}`);
            return null;
        }
        
        // 确定层级
        const targetLayer = layer || this.getDefaultLayer(uiType);
        const parentNode = this.getLayerNode(targetLayer);
        if (!parentNode) {
            console.error(`层级节点不存在: ${targetLayer}`);
            return null;
        }
        
        // 实例化UI
        const uiNode = instantiate(prefab);
        parentNode.addChild(uiNode);
        
        // 设置UI数据
        const uiData: IUIData = {
            uiType: uiType,
            layer: targetLayer,
            state: UIState.HIDDEN,
            node: uiNode,
            isModal: isModal,
            isPersistent: isPersistent,
            priority: this.getUIPriority(uiType)
        };
        
        // 设置初始状态
        uiNode.active = false;
        
        // 注册到UI映射
        this._uiMap.set(uiType, uiData);
        
        console.log(`创建UI: ${uiType}`);
        return uiData;
    }
    
    /**
     * 显示已存在的UI
     */
    private showExistingUI(uiData: IUIData): boolean {
        if (uiData.state === UIState.VISIBLE) {
            return true;
        }
        
        // 检查模态UI冲突
        if (uiData.isModal && this._modalStack.length > 0) {
            const topModal = this._modalStack[this._modalStack.length - 1];
            if (topModal !== uiData.uiType) {
                console.warn("存在模态UI冲突");
                return false;
            }
        }
        
        // 更新状态
        uiData.state = UIState.SHOWING;
        
        // 显示节点
        uiData.node.active = true;
        
        // 添加到栈
        this.addToUIStack(uiData);
        
        // 播放显示动画
        this.playShowAnimation(uiData);
        
        // 更新状态
        uiData.state = UIState.VISIBLE;
        
        console.log(`显示UI: ${uiData.uiType}`);
        return true;
    }
    
    /**
     * 隐藏UI
     */
    public hideUI(uiType: UIType, immediate: boolean = false): boolean {
        const uiData = this._uiMap.get(uiType);
        if (!uiData) {
            console.warn(`UI不存在: ${uiType}`);
            return false;
        }
        
        if (uiData.state === UIState.HIDDEN) {
            console.log(`UI已隐藏: ${uiType}`);
            return true;
        }
        
        // 更新状态
        uiData.state = UIState.HIDING;
        
        // 从栈中移除
        this.removeFromUIStack(uiData);
        
        if (immediate) {
            // 立即隐藏
            uiData.node.active = false;
            uiData.state = UIState.HIDDEN;
        } else {
            // 播放隐藏动画
            this.playHideAnimation(uiData);
        }
        
        console.log(`隐藏UI: ${uiType}`);
        return true;
    }
    
    /**
     * 切换UI显示状态
     */
    public toggleUI(uiType: UIType): boolean {
        const uiData = this._uiMap.get(uiType);
        if (!uiData) {
            return this.showUI(uiType);
        }
        
        if (uiData.state === UIState.VISIBLE) {
            return this.hideUI(uiType);
        } else {
            return this.showUI(uiType);
        }
    }
    
    /**
     * 关闭所有UI
     */
    public closeAllUI(exceptPersistent: boolean = true): void {
        for (const uiData of this._uiMap.values()) {
            if (exceptPersistent && uiData.isPersistent) {
                continue;
            }
            
            if (uiData.state === UIState.VISIBLE) {
                this.hideUI(uiData.uiType, true);
            }
        }
        
        this._uiStack = [];
        this._modalStack = [];
        
        console.log("关闭所有UI");
    }
    
    /**
     * 关闭模态UI
     */
    public closeModalUI(): void {
        if (this._modalStack.length === 0) {
            return;
        }
        
        const topModal = this._modalStack[this._modalStack.length - 1];
        this.hideUI(topModal);
    }
    
    /**
     * 添加到UI栈
     */
    private addToUIStack(uiData: IUIData): void {
        // 移除已存在的
        const index = this._uiStack.indexOf(uiData.uiType);
        if (index !== -1) {
            this._uiStack.splice(index, 1);
        }
        
        // 添加到栈顶
        this._uiStack.push(uiData.uiType);
        
        // 如果是模态UI，添加到模态栈
        if (uiData.isModal) {
            this._modalStack.push(uiData.uiType);
        }
    }
    
    /**
     * 从UI栈移除
     */
    private removeFromUIStack(uiData: IUIData): void {
        // 从普通栈移除
        const index = this._uiStack.indexOf(uiData.uiType);
        if (index !== -1) {
            this._uiStack.splice(index, 1);
        }
        
        // 从模态栈移除
        if (uiData.isModal) {
            const modalIndex = this._modalStack.indexOf(uiData.uiType);
            if (modalIndex !== -1) {
                this._modalStack.splice(modalIndex, 1);
            }
        }
    }
    
    /**
     * 查找UI预制体
     */
    private findUIPrefab(uiType: UIType): Prefab | null {
        // 这里应该根据UI类型查找对应的预制体
        // 暂时返回null，实际实现中需要建立映射关系
        console.log(`查找UI预制体: ${uiType}`);
        return null;
    }
    
    /**
     * 获取默认层级
     */
    private getDefaultLayer(uiType: UIType): UILayer {
        switch (uiType) {
            case UIType.MAIN_MENU:
            case UIType.GAME_OVER:
            case UIType.VICTORY:
                return UILayer.BACKGROUND;
            case UIType.GAME_HUD:
            case UIType.TOWER_DEFENSE_HUD:
            case UIType.ROGUELIKE_HUD:
                return UILayer.NORMAL;
            case UIType.INVENTORY:
            case UIType.UPGRADE:
            case UIType.SETTINGS:
                return UILayer.DIALOG;
            case UIType.PAUSE_MENU:
                return UILayer.POPUP;
            case UIType.LOADING:
                return UILayer.LOADING;
            case UIType.NOTIFICATION:
                return UILayer.TOP;
            default:
                return UILayer.NORMAL;
        }
    }
    
    /**
     * 获取层级节点
     */
    private getLayerNode(layer: UILayer): Node | null {
        switch (layer) {
            case UILayer.BACKGROUND:
                return this.backgroundLayer;
            case UILayer.NORMAL:
                return this.normalLayer;
            case UILayer.DIALOG:
                return this.dialogLayer;
            case UILayer.POPUP:
                return this.popupLayer;
            case UILayer.LOADING:
                return this.loadingLayer;
            case UILayer.TOP:
                return this.topLayer;
            default:
                return this.normalLayer;
        }
    }
    
    /**
     * 获取UI优先级
     */
    private getUIPriority(uiType: UIType): number {
        switch (uiType) {
            case UIType.LOADING:
                return 1000;
            case UIType.NOTIFICATION:
                return 900;
            case UIType.PAUSE_MENU:
                return 800;
            case UIType.INVENTORY:
            case UIType.UPGRADE:
            case UIType.SETTINGS:
                return 700;
            case UIType.GAME_HUD:
            case UIType.TOWER_DEFENSE_HUD:
            case UIType.ROGUELIKE_HUD:
                return 600;
            case UIType.MAIN_MENU:
            case UIType.GAME_OVER:
            case UIType.VICTORY:
                return 500;
            default:
                return 100;
        }
    }
    
    /**
     * 播放显示动画
     */
    private playShowAnimation(uiData: IUIData): void {
        // 这里实现UI显示动画
        console.log(`播放显示动画: ${uiData.uiType}`);
    }
    
    /**
     * 播放隐藏动画
     */
    private playHideAnimation(uiData: IUIData): void {
        // 这里实现UI隐藏动画
        console.log(`播放隐藏动画: ${uiData.uiType}`);
        
        // 动画完成后隐藏
        this.scheduleOnce(() => {
            uiData.node.active = false;
            uiData.state = UIState.HIDDEN;
        }, 0.3);
    }
    
    /**
     * 显示主菜单
     */
    private showMainMenu(): void {
        this.closeAllUI();
        this.showUI(UIType.MAIN_MENU);
        this._currentGameUI = UIType.MAIN_MENU;
    }
    
    /**
     * 显示塔防HUD
     */
    private showTowerDefenseHUD(): void {
        this.closeAllUI();
        this.showUI(UIType.TOWER_DEFENSE_HUD);
        this._currentGameUI = UIType.TOWER_DEFENSE_HUD;
    }
    
    /**
     * 显示肉鸽HUD
     */
    private showRoguelikeHUD(): void {
        this.closeAllUI();
        this.showUI(UIType.ROGUELIKE_HUD);
        this._currentGameUI = UIType.ROGUELIKE_HUD;
    }
    
    /**
     * 显示暂停菜单
     */
    private showPauseMenu(): void {
        this.showUI(UIType.PAUSE_MENU, UILayer.POPUP, true);
    }
    
    /**
     * 显示背包
     */
    public showInventory(): void {
        this.showUI(UIType.INVENTORY, UILayer.DIALOG, true);
    }
    
    /**
     * 显示升级界面
     */
    public showUpgrade(): void {
        this.showUI(UIType.UPGRADE, UILayer.DIALOG, true);
    }
    
    /**
     * 显示设置界面
     */
    public showSettings(): void {
        this.showUI(UIType.SETTINGS, UILayer.DIALOG, true);
    }
    
    /**
     * 显示通知
     */
    public showNotification(message: string, duration: number = 3.0): void {
        console.log(`显示通知: ${message}`);
        // 这里实现通知显示逻辑
    }
    
    /**
     * 获取当前游戏UI
     */
    public getCurrentGameUI(): UIType | null {
        return this._currentGameUI;
    }
    
    /**
     * 获取UI数据
     */
    public getUIData(uiType: UIType): IUIData | null {
        return this._uiMap.get(uiType) || null;
    }
    
    /**
     * 检查UI是否显示
     */
    public isUIVisible(uiType: UIType): boolean {
        const uiData = this._uiMap.get(uiType);
        return uiData ? uiData.state === UIState.VISIBLE : false;
    }
    
    /**
     * 获取UI栈
     */
    public getUIStack(): UIType[] {
        return [...this._uiStack];
    }
    
    /**
     * 获取模态UI栈
     */
    public getModalStack(): UIType[] {
        return [...this._modalStack];
    }
    
    onDestroy() {
        if (UIManager._instance === this) {
            UIManager._instance = null;
        }
    }
}
