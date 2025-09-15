import { _decorator, Component, Node, Vec3, input, Input, EventKeyboard, KeyCode, v3, Camera, UITransform, EventMouse, EventTouch, sys } from 'cc';
import { BaseCharacter, CharacterDirection, CharacterFaction, CharacterState } from './BaseCharacter';
import { logger, LogCategory } from '../Core/Logger';
import { EventBus, EventType } from '../Core/EventBus';
import { GameManager } from '../Core/GameManager';
import { GameState } from '../Core/GameState';

/**
 * 玩家输入模式枚举
 */
export enum PlayerInputMode {
    /** 键盘WASD移动 */
    KEYBOARD,
    /** 鼠标点击移动 */
    MOUSE_CLICK,
    /** 触摸屏移动 */
    TOUCH,
    /** 虚拟摇杆移动 */
    VIRTUAL_JOYSTICK
}

/**
 * 玩家控制器组件
 * 负责处理玩家输入并控制玩家角色的移动和行为
 */
export class PlayerController extends BaseCharacter {
    /** 输入模式 */
    public inputMode: PlayerInputMode = PlayerInputMode.KEYBOARD;
    
    /** 移动按键状态 */
    private _moveKeyStates: Record<string, boolean> = {
        'up': false,
        'down': false,
        'left': false,
        'right': false
    };
    
    /** 是否正在攻击 */
    private _isAttacking: boolean = false;
    /** 攻击目标 */
    private _attackTarget: BaseCharacter = null;
    /** 自动攻击范围内的敌人 */
    private _enemiesInRange: BaseCharacter[] = [];
    /** 是否启用自动攻击 */
    private _autoAttackEnabled: boolean = true;
    /** 自动攻击检测间隔 */
    private _autoAttackCheckInterval: number = 0.2;
    /** 自动攻击计时器 */
    private _autoAttackTimer: number = 0;
    
    /** 主摄像机 */
    private _mainCamera: Camera = null;
    /** 移动目标标记节点 */
    private _moveTargetMarker: Node = null;
    /** 是否显示移动标记 */
    private _showMoveMarker: boolean = true;
    
    /** 虚拟摇杆节点 */
    private _virtualJoystick: Node = null;
    /** 虚拟摇杆中心位置 */
    private _joystickCenter: Vec3 = v3(0, 0, 0);
    /** 虚拟摇杆当前位置 */
    private _joystickCurrent: Vec3 = v3(0, 0, 0);
    /** 虚拟摇杆最大半径 */
    private _joystickMaxRadius: number = 100;
    /** 虚拟摇杆是否激活 */
    private _joystickActive: boolean = false;
    
    /**
     * 组件加载时调用
     */
    protected onLoad(): void {
        super.onLoad();
        
        // 设置角色属性
        this.characterName = "Player";
        this.faction = CharacterFaction.PLAYER;
        
        // 获取主摄像机
        this._mainCamera = GameManager.getInstance().getMainCamera();
        
        // 创建移动目标标记
        this._createMoveTargetMarker();
        
        // 初始化虚拟摇杆
        this._initVirtualJoystick();
        
        // 根据平台设置默认输入模式
        this._setupDefaultInputMode();
        
        logger.info(LogCategory.CHARACTER, "玩家控制器已加载");
    }
    
    /**
     * 组件启用时调用
     */
    protected onEnable(): void {
        super.onEnable();
        
        // 注册输入事件
        this._registerInputEvents();
    }
    
    /**
     * 组件禁用时调用
     */
    protected onDisable(): void {
        super.onDisable();
        
        // 注销输入事件
        this._unregisterInputEvents();
    }
    
    /**
     * 每帧更新时调用
     * @param dt 帧间隔时间
     */
    protected update(dt: number): void {
        super.update(dt);
        
        // 处理键盘输入移动
        if (this.inputMode === PlayerInputMode.KEYBOARD) {
            this._handleKeyboardMovement();
        }
        
        // 处理虚拟摇杆移动
        if (this.inputMode === PlayerInputMode.VIRTUAL_JOYSTICK && this._joystickActive) {
            this._handleJoystickMovement();
        }
        
        // 更新自动攻击
        this._updateAutoAttack(dt);
    }
    
    /**
     * 注册事件监听
     */
    protected _registerEvents(): void {
        super._registerEvents();
        
        // 监听游戏状态变化事件
        EventBus.getInstance().on(EventType.GAME_STATE_CHANGED, this._onGameStateChanged, this);
    }
    
    /**
     * 注销事件监听
     */
    protected _unregisterEvents(): void {
        super._unregisterEvents();
        
        // 注销游戏状态变化事件
        EventBus.getInstance().off(EventType.GAME_STATE_CHANGED, this._onGameStateChanged, this);
    }
    
    /**
     * 注册输入事件
     */
    private _registerInputEvents(): void {
        // 根据输入模式注册不同的事件
        switch (this.inputMode) {
            case PlayerInputMode.KEYBOARD:
                // 注册键盘事件
                input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
                input.on(Input.EventType.KEY_UP, this._onKeyUp, this);
                break;
                
            case PlayerInputMode.MOUSE_CLICK:
                // 注册鼠标事件
                input.on(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
                break;
                
            case PlayerInputMode.TOUCH:
                // 注册触摸事件
                input.on(Input.EventType.TOUCH_START, this._onTouchStart, this);
                break;
                
            case PlayerInputMode.VIRTUAL_JOYSTICK:
                // 注册触摸事件用于虚拟摇杆
                if (this._virtualJoystick) {
                    input.on(Input.EventType.TOUCH_START, this._onJoystickTouchStart, this);
                    input.on(Input.EventType.TOUCH_MOVE, this._onJoystickTouchMove, this);
                    input.on(Input.EventType.TOUCH_END, this._onJoystickTouchEnd, this);
                    input.on(Input.EventType.TOUCH_CANCEL, this._onJoystickTouchEnd, this);
                }
                break;
        }
    }
    
    /**
     * 注销输入事件
     */
    private _unregisterInputEvents(): void {
        // 注销所有可能的输入事件
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this._onKeyUp, this);
        input.off(Input.EventType.MOUSE_DOWN, this._onMouseDown, this);
        input.off(Input.EventType.TOUCH_START, this._onTouchStart, this);
        input.off(Input.EventType.TOUCH_START, this._onJoystickTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this._onJoystickTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this._onJoystickTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this._onJoystickTouchEnd, this);
    }
    
    /**
     * 设置默认输入模式
     */
    private _setupDefaultInputMode(): void {
        // 根据平台设置默认输入模式
        if (sys.isMobile) {
            // 移动设备使用虚拟摇杆
            this.inputMode = PlayerInputMode.VIRTUAL_JOYSTICK;
            // 显示虚拟摇杆
            if (this._virtualJoystick) {
                this._virtualJoystick.active = true;
            }
        } else {
            // PC设备使用键盘
            this.inputMode = PlayerInputMode.KEYBOARD;
            // 隐藏虚拟摇杆
            if (this._virtualJoystick) {
                this._virtualJoystick.active = false;
            }
        }
    }
    
    /**
     * 创建移动目标标记
     */
    private _createMoveTargetMarker(): void {
        // 创建移动标记节点
        this._moveTargetMarker = new Node('MoveTargetMarker');
        // 添加到场景
        GameManager.getInstance().getUIRoot().addChild(this._moveTargetMarker);
        // 默认隐藏
        this._moveTargetMarker.active = false;
        
        // TODO: 添加标记的视觉效果（精灵、动画等）
    }
    
    /**
     * 初始化虚拟摇杆
     */
    private _initVirtualJoystick(): void {
        // 创建虚拟摇杆节点
        this._virtualJoystick = new Node('VirtualJoystick');
        // 添加到UI层
        GameManager.getInstance().getUIRoot().addChild(this._virtualJoystick);
        // 默认隐藏
        this._virtualJoystick.active = false;
        
        // TODO: 添加摇杆的视觉效果（背景、手柄等）
    }
    
    /**
     * 键盘按键按下回调
     * @param event 键盘事件
     */
    private _onKeyDown(event: EventKeyboard): void {
        // 如果不能移动，则忽略输入
        if (!this.canMove()) {
            return;
        }
        
        // 更新移动按键状态
        switch (event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this._moveKeyStates.up = true;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this._moveKeyStates.down = true;
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this._moveKeyStates.left = true;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._moveKeyStates.right = true;
                break;
            case KeyCode.SPACE:
                // 空格键攻击最近的敌人
                this._attackNearestEnemy();
                break;
        }
    }
    
    /**
     * 键盘按键抬起回调
     * @param event 键盘事件
     */
    private _onKeyUp(event: EventKeyboard): void {
        // 更新移动按键状态
        switch (event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this._moveKeyStates.up = false;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this._moveKeyStates.down = false;
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this._moveKeyStates.left = false;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._moveKeyStates.right = false;
                break;
        }
    }
    
    /**
     * 鼠标按下回调
     * @param event 鼠标事件
     */
    private _onMouseDown(event: EventMouse): void {
        // 如果不能移动，则忽略输入
        if (!this.canMove()) {
            return;
        }
        
        // 获取鼠标点击的世界坐标
        const screenPos = v3(event.getLocationX(), event.getLocationY(), 0);
        const worldPos = this._screenToWorldPoint(screenPos);
        
        // 显示移动标记
        if (this._showMoveMarker && this._moveTargetMarker) {
            this._moveTargetMarker.position = worldPos.clone();
            this._moveTargetMarker.active = true;
            
            // 2秒后隐藏标记
            this.scheduleOnce(() => {
                if (this._moveTargetMarker) {
                    this._moveTargetMarker.active = false;
                }
            }, 2);
        }
        
        // 移动到目标位置
        this.moveTo(worldPos);
    }
    
    /**
     * 触摸开始回调
     * @param event 触摸事件
     */
    private _onTouchStart(event: EventTouch): void {
        // 如果不能移动，则忽略输入
        if (!this.canMove()) {
            return;
        }
        
        // 获取触摸点的世界坐标
        const screenPos = v3(event.getLocationX(), event.getLocationY(), 0);
        const worldPos = this._screenToWorldPoint(screenPos);
        
        // 显示移动标记
        if (this._showMoveMarker && this._moveTargetMarker) {
            this._moveTargetMarker.position = worldPos.clone();
            this._moveTargetMarker.active = true;
            
            // 2秒后隐藏标记
            this.scheduleOnce(() => {
                if (this._moveTargetMarker) {
                    this._moveTargetMarker.active = false;
                }
            }, 2);
        }
        
        // 移动到目标位置
        this.moveTo(worldPos);
    }
    
    /**
     * 虚拟摇杆触摸开始回调
     * @param event 触摸事件
     */
    private _onJoystickTouchStart(event: EventTouch): void {
        // 如果不能移动，则忽略输入
        if (!this.canMove()) {
            return;
        }
        
        // 获取触摸点的屏幕坐标
        const touchPos = v3(event.getLocationX(), event.getLocationY(), 0);
        
        // 设置摇杆中心位置
        this._joystickCenter = touchPos.clone();
        this._joystickCurrent = touchPos.clone();
        
        // 显示虚拟摇杆
        if (this._virtualJoystick) {
            this._virtualJoystick.position = this._joystickCenter;
            this._virtualJoystick.active = true;
        }
        
        // 激活摇杆
        this._joystickActive = true;
    }
    
    /**
     * 虚拟摇杆触摸移动回调
     * @param event 触摸事件
     */
    private _onJoystickTouchMove(event: EventTouch): void {
        // 如果摇杆未激活，则忽略
        if (!this._joystickActive) {
            return;
        }
        
        // 获取触摸点的屏幕坐标
        const touchPos = v3(event.getLocationX(), event.getLocationY(), 0);
        
        // 计算触摸点与摇杆中心的向量
        const direction = Vec3.subtract(new Vec3(), touchPos, this._joystickCenter);
        const distance = direction.length();
        
        // 限制摇杆范围
        if (distance > this._joystickMaxRadius) {
            Vec3.normalize(direction, direction);
            Vec3.multiplyScalar(direction, direction, this._joystickMaxRadius);
            this._joystickCurrent = Vec3.add(new Vec3(), this._joystickCenter, direction);
        } else {
            this._joystickCurrent = touchPos.clone();
        }
        
        // 更新摇杆手柄位置
        // TODO: 更新摇杆手柄的视觉位置
    }
    
    /**
     * 虚拟摇杆触摸结束回调
     * @param event 触摸事件
     */
    private _onJoystickTouchEnd(event: EventTouch): void {
        // 重置摇杆状态
        this._joystickActive = false;
        
        // 隐藏虚拟摇杆
        if (this._virtualJoystick) {
            this._virtualJoystick.active = false;
        }
        
        // 停止移动
        this.stopMoving();
    }
    
    /**
     * 处理键盘移动输入
     */
    private _handleKeyboardMovement(): void {
        // 如果不能移动，则返回
        if (!this.canMove()) {
            return;
        }
        
        // 计算移动方向
        const direction = v3(0, 0, 0);
        
        if (this._moveKeyStates.up) direction.y += 1;
        if (this._moveKeyStates.down) direction.y -= 1;
        if (this._moveKeyStates.left) direction.x -= 1;
        if (this._moveKeyStates.right) direction.x += 1;
        
        // 如果有输入，则移动
        if (!Vec3.equals(direction, Vec3.ZERO)) {
            // 标准化方向向量
            Vec3.normalize(direction, direction);
            
            // 设置移动方向
            this.setMoveDirection(direction);
        } else if (this._isMoving) {
            // 如果没有输入但正在移动，则停止移动
            this.stopMoving();
        }
    }
    
    /**
     * 处理虚拟摇杆移动
     */
    private _handleJoystickMovement(): void {
        // 如果不能移动，则返回
        if (!this.canMove()) {
            return;
        }
        
        // 计算摇杆方向
        const direction = Vec3.subtract(new Vec3(), this._joystickCurrent, this._joystickCenter);
        const distance = direction.length();
        
        // 如果摇杆偏移足够大，则移动
        if (distance > 10) { // 设置一个小的阈值，避免微小抖动
            // 标准化方向向量
            Vec3.normalize(direction, direction);
            
            // 设置移动方向
            this.setMoveDirection(direction);
        } else {
            // 如果摇杆回到中心，则停止移动
            this.stopMoving();
        }
    }
    
    /**
     * 更新自动攻击
     * @param dt 帧间隔时间
     */
    private _updateAutoAttack(dt: number): void {
        // 如果不能攻击或自动攻击未启用，则返回
        if (!this.canAttack() || !this._autoAttackEnabled) {
            return;
        }
        
        // 更新自动攻击计时器
        this._autoAttackTimer -= dt;
        if (this._autoAttackTimer <= 0) {
            this._autoAttackTimer = this._autoAttackCheckInterval;
            
            // 检测范围内的敌人
            this._detectEnemiesInRange();
            
            // 如果有攻击目标，则攻击
            if (this._attackTarget && this._attackTarget.isAlive()) {
                this.attack(this._attackTarget);
            } else if (this._enemiesInRange.length > 0) {
                // 如果没有攻击目标但有范围内的敌人，则选择最近的敌人作为目标
                this._attackTarget = this._findNearestEnemy();
                if (this._attackTarget) {
                    this.attack(this._attackTarget);
                }
            }
        }
    }
    
    /**
     * 检测攻击范围内的敌人
     */
    private _detectEnemiesInRange(): void {
        // 清空范围内敌人列表
        this._enemiesInRange = [];
        
        // 获取当前场景中的所有敌人
        const enemies = this._getEnemiesInScene();
        
        // 遍历敌人，检查是否在攻击范围内
        for (const enemy of enemies) {
            if (enemy.isAlive()) {
                const distance = Vec3.distance(this.node.position, enemy.node.position);
                if (distance <= this.attributes.attackRange) {
                    this._enemiesInRange.push(enemy);
                }
            }
        }
    }
    
    /**
     * 获取场景中的所有敌人
     */
    private _getEnemiesInScene(): BaseCharacter[] {
        // 这里应该根据实际游戏逻辑获取场景中的敌人
        // 示例实现，实际项目中应该使用更高效的方式
        const enemies: BaseCharacter[] = [];
        
        // 获取当前场景中的所有BaseCharacter组件
        const characters = GameManager.getInstance().getCurrentScene().getComponentsInChildren(BaseCharacter);
        
        // 筛选出敌人阵营的角色
        for (const character of characters) {
            if (character.faction === CharacterFaction.ENEMY && character !== this) {
                enemies.push(character);
            }
        }
        
        return enemies;
    }
    
    /**
     * 查找最近的敌人
     */
    private _findNearestEnemy(): BaseCharacter {
        if (this._enemiesInRange.length === 0) {
            return null;
        }
        
        let nearestEnemy = this._enemiesInRange[0];
        let minDistance = Vec3.distance(this.node.position, nearestEnemy.node.position);
        
        for (let i = 1; i < this._enemiesInRange.length; i++) {
            const enemy = this._enemiesInRange[i];
            const distance = Vec3.distance(this.node.position, enemy.node.position);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestEnemy = enemy;
            }
        }
        
        return nearestEnemy;
    }
    
    /**
     * 攻击最近的敌人
     */
    private _attackNearestEnemy(): void {
        // 检测范围内的敌人
        this._detectEnemiesInRange();
        
        // 查找最近的敌人
        const nearestEnemy = this._findNearestEnemy();
        
        // 如果有敌人，则攻击
        if (nearestEnemy) {
            this._attackTarget = nearestEnemy;
            this.attack(nearestEnemy);
        }
    }
    
    /**
     * 屏幕坐标转世界坐标
     * @param screenPos 屏幕坐标
     */
    private _screenToWorldPoint(screenPos: Vec3): Vec3 {
        if (!this._mainCamera) {
            return screenPos.clone();
        }
        
        // 使用摄像机将屏幕坐标转换为世界坐标
        const worldPos = this._mainCamera.screenToWorld(screenPos);
        
        // 确保z坐标为0（2D游戏）
        worldPos.z = 0;
        
        return worldPos;
    }
    
    /**
     * 游戏状态变化回调
     * @param event 事件数据
     */
    private _onGameStateChanged(event: any): void {
        const { oldState, newState } = event;
        
        // 根据游戏状态调整玩家控制
        switch (newState) {
            case GameState.PLAYING:
                // 游戏进行中，启用控制
                this._canMove = true;
                this._canAttack = true;
                break;
                
            case GameState.PAUSED:
                // 游戏暂停，禁用控制
                this._canMove = false;
                this._canAttack = false;
                this.stopMoving();
                break;
                
            case GameState.GAME_OVER:
                // 游戏结束，禁用控制
                this._canMove = false;
                this._canAttack = false;
                this.stopMoving();
                break;
        }
    }
    
    /**
     * 设置输入模式
     * @param mode 输入模式
     */
    public setInputMode(mode: PlayerInputMode): void {
        // 如果模式没有变化，则返回
        if (this.inputMode === mode) {
            return;
        }
        
        // 注销当前输入事件
        this._unregisterInputEvents();
        
        // 更新输入模式
        this.inputMode = mode;
        
        // 注册新的输入事件
        this._registerInputEvents();
        
        // 更新UI显示
        if (this._virtualJoystick) {
            this._virtualJoystick.active = (mode === PlayerInputMode.VIRTUAL_JOYSTICK);
        }
        
        logger.info(LogCategory.CHARACTER, `玩家输入模式已切换: ${PlayerInputMode[mode]}`);
    }
    
    /**
     * 设置是否启用自动攻击
     * @param enabled 是否启用
     */
    public setAutoAttack(enabled: boolean): void {
        this._autoAttackEnabled = enabled;
    }
    
    /**
     * 设置是否显示移动标记
     * @param show 是否显示
     */
    public setShowMoveMarker(show: boolean): void {
        this._showMoveMarker = show;
    }
    
    /**
     * 执行攻击逻辑
     * @param target 攻击目标
     */
    protected _performAttack(target: BaseCharacter): void {
        // 调用基类的攻击逻辑
        super._performAttack(target);
        
        // 触发玩家攻击事件
        EventBus.getInstance().emit(EventType.PLAYER_ATTACK, {
            player: this,
            target: target
        });
    }
    
    /**
     * 受到伤害
     * @param damage 伤害值
     * @param attacker 攻击者
     */
    public takeDamage(damage: number, attacker?: BaseCharacter): void {
        // 调用基类的受伤逻辑
        super.takeDamage(damage, attacker);
        
        // 触发玩家受伤事件
        if (this.isAlive()) {
            EventBus.getInstance().emit(EventType.PLAYER_HURT, {
                player: this,
                attacker: attacker,
                damage: damage,
                remainingHealth: this.attributes.currentHealth,
                healthPercent: this.getHealthPercent()
            });
        }
    }
    
    /**
     * 死亡
     */
    public die(): void {
        // 调用基类的死亡逻辑
        super.die();
        
        // 触发玩家死亡事件
        EventBus.getInstance().emit(EventType.PLAYER_DEATH, {
            player: this
        });
    }
    
    /**
     * 复活
     * @param healthPercent 复活后的生命值百分比 (0-1)
     */
    public revive(healthPercent: number = 0.5): void {
        // 调用基类的复活逻辑
        super.revive(healthPercent);
        
        // 触发玩家复活事件
        EventBus.getInstance().emit(EventType.PLAYER_REVIVE, {
            player: this,
            healthPercent: healthPercent
        });
    }
}