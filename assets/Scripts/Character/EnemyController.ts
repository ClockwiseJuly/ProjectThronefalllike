import { _decorator, Component, Node, Vec3, v3 } from 'cc';
import { BaseCharacter, CharacterDirection, CharacterFaction, CharacterState } from './BaseCharacter';
import { logger, LogCategory } from '../Core/Logger';
import { EventBus, EventType } from '../Core/EventBus';
import { GameManager } from '../Core/GameManager';
import { PlayerController } from './PlayerController';

/**
 * 敌人类型枚举
 */
export enum EnemyType {
    /** 近战敌人 */
    MELEE = 'melee',
    /** 远程敌人 */
    RANGED = 'ranged',
    /** 精英敌人 */
    ELITE = 'elite',
    /** Boss敌人 */
    BOSS = 'boss'
}

/**
 * 敌人AI行为状态枚举
 */
export enum EnemyAIState {
    /** 空闲状态 */
    IDLE = 'idle',
    /** 巡逻状态 */
    PATROL = 'patrol',
    /** 追击状态 */
    CHASE = 'chase',
    /** 攻击状态 */
    ATTACK = 'attack',
    /** 逃跑状态 */
    FLEE = 'flee',
    /** 受伤状态 */
    HURT = 'hurt',
    /** 死亡状态 */
    DEAD = 'dead'
}

/**
 * 敌人控制器组件
 * 负责控制敌人的AI行为和战斗逻辑
 */
export class EnemyController extends BaseCharacter {
    /** 敌人类型 */
    public enemyType: EnemyType = EnemyType.MELEE;
    /** 敌人AI状态 */
    private _aiState: EnemyAIState = EnemyAIState.IDLE;
    
    /** 视野范围 */
    public visionRange: number = 8;
    /** 听觉范围 */
    public hearingRange: number = 5;
    /** 追击范围 */
    public chaseRange: number = 10;
    /** 攻击触发范围 */
    public attackTriggerRange: number = 1.5;
    /** 最小攻击间隔（秒） */
    public minAttackInterval: number = 1.5;
    /** 巡逻速度 */
    public patrolSpeed: number = 2;
    /** 追击速度 */
    public chaseSpeed: number = 4;
    
    /** 是否是主动攻击型敌人 */
    public isAggressive: boolean = true;
    /** 是否可以远程攻击 */
    public canRangedAttack: boolean = false;
    /** 远程攻击范围 */
    public rangedAttackRange: number = 6;
    /** 远程攻击冷却时间 */
    public rangedAttackCooldown: number = 3;
    /** 当前远程攻击冷却计时器 */
    private _rangedAttackTimer: number = 0;
    
    /** 目标玩家 */
    private _targetPlayer: PlayerController = null;
    /** 上次看到玩家的时间 */
    private _lastPlayerSightingTime: number = 0;
    /** 玩家丢失追踪时间 */
    private _playerTrackingLostTime: number = 5;
    /** 上次攻击时间 */
    private _lastAttackTime: number = 0;
    
    /** 巡逻路径点 */
    private _patrolPoints: Vec3[] = [];
    /** 当前巡逻点索引 */
    private _currentPatrolIndex: number = 0;
    /** 巡逻等待时间 */
    private _patrolWaitTime: number = 2;
    /** 巡逻等待计时器 */
    private _patrolWaitTimer: number = 0;
    /** 是否正在巡逻等待 */
    private _isWaitingAtPatrol: boolean = false;
    
    /** 行为树更新间隔 */
    private _aiUpdateInterval: number = 0.2;
    /** 行为树更新计时器 */
    private _aiUpdateTimer: number = 0;
    
    /** 是否启用AI */
    private _aiEnabled: boolean = true;
    
    /**
     * 组件加载时调用
     */
    protected onLoad(): void {
        super.onLoad();
        
        // 设置角色属性
        this.characterName = "Enemy";
        this.faction = CharacterFaction.ENEMY;
        
        // 初始化巡逻路径
        this._initPatrolPoints();
        
        logger.info(LogCategory.CHARACTER, `敌人控制器已加载: ${this.characterName}, 类型: ${this.enemyType}`);
    }
    
    /**
     * 组件启用时调用
     */
    protected onEnable(): void {
        super.onEnable();
        
        // 注册事件监听
        this._registerEvents();
    }
    
    /**
     * 组件禁用时调用
     */
    protected onDisable(): void {
        super.onDisable();
        
        // 注销事件监听
        this._unregisterEvents();
    }
    
    /**
     * 每帧更新时调用
     * @param dt 帧间隔时间
     */
    protected update(dt: number): void {
        super.update(dt);
        
        // 如果AI未启用或角色已死亡，则不更新AI
        if (!this._aiEnabled || !this.isAlive()) {
            return;
        }
        
        // 更新远程攻击冷却
        if (this._rangedAttackTimer > 0) {
            this._rangedAttackTimer -= dt;
        }
        
        // 更新AI行为树
        this._aiUpdateTimer -= dt;
        if (this._aiUpdateTimer <= 0) {
            this._aiUpdateTimer = this._aiUpdateInterval;
            this._updateAI();
        }
        
        // 根据当前AI状态执行相应行为
        this._executeCurrentBehavior(dt);
    }
    
    /**
     * 注册事件监听
     */
    protected _registerEvents(): void {
        super._registerEvents();
        
        // 监听玩家攻击事件
        EventBus.getInstance().on(EventType.PLAYER_ATTACK, this._onPlayerAttack, this);
        
        // 监听游戏状态变化事件
        EventBus.getInstance().on(EventType.GAME_STATE_CHANGED, this._onGameStateChanged, this);
    }
    
    /**
     * 注销事件监听
     */
    protected _unregisterEvents(): void {
        super._unregisterEvents();
        
        // 注销玩家攻击事件
        EventBus.getInstance().off(EventType.PLAYER_ATTACK, this._onPlayerAttack, this);
        
        // 注销游戏状态变化事件
        EventBus.getInstance().off(EventType.GAME_STATE_CHANGED, this._onGameStateChanged, this);
    }
    
    /**
     * 初始化巡逻路径
     */
    private _initPatrolPoints(): void {
        // 清空巡逻点
        this._patrolPoints = [];
        
        // 默认在当前位置周围生成几个巡逻点
        const center = this.node.position.clone();
        const radius = 5; // 巡逻半径
        
        // 生成4个巡逻点
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;
            this._patrolPoints.push(v3(x, y, 0));
        }
        
        // 添加中心点
        this._patrolPoints.push(center);
        
        // 随机打乱巡逻点顺序
        this._shufflePatrolPoints();
    }
    
    /**
     * 随机打乱巡逻点顺序
     */
    private _shufflePatrolPoints(): void {
        for (let i = this._patrolPoints.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this._patrolPoints[i], this._patrolPoints[j]] = [this._patrolPoints[j], this._patrolPoints[i]];
        }
    }
    
    /**
     * 设置巡逻路径
     * @param points 巡逻路径点数组
     */
    public setPatrolPoints(points: Vec3[]): void {
        if (points && points.length > 0) {
            this._patrolPoints = points.map(p => p.clone());
            this._currentPatrolIndex = 0;
        }
    }
    
    /**
     * 更新AI行为树
     */
    private _updateAI(): void {
        // 如果角色已死亡，则设置为死亡状态
        if (!this.isAlive()) {
            this._setAIState(EnemyAIState.DEAD);
            return;
        }
        
        // 如果正在受伤，则不改变状态
        if (this._currentState === CharacterState.HURT) {
            return;
        }
        
        // 获取玩家
        this._findTargetPlayer();
        
        // 根据当前状态和条件决定下一个状态
        switch (this._aiState) {
            case EnemyAIState.IDLE:
                this._updateIdleState();
                break;
                
            case EnemyAIState.PATROL:
                this._updatePatrolState();
                break;
                
            case EnemyAIState.CHASE:
                this._updateChaseState();
                break;
                
            case EnemyAIState.ATTACK:
                this._updateAttackState();
                break;
                
            case EnemyAIState.FLEE:
                this._updateFleeState();
                break;
                
            case EnemyAIState.HURT:
                // 受伤状态由角色基类控制
                break;
                
            case EnemyAIState.DEAD:
                // 死亡状态不需要更新
                break;
        }
    }
    
    /**
     * 执行当前行为
     * @param dt 帧间隔时间
     */
    private _executeCurrentBehavior(dt: number): void {
        switch (this._aiState) {
            case EnemyAIState.IDLE:
                // 空闲状态不需要特殊处理
                break;
                
            case EnemyAIState.PATROL:
                this._executePatrolBehavior(dt);
                break;
                
            case EnemyAIState.CHASE:
                this._executeChaseBehavior();
                break;
                
            case EnemyAIState.ATTACK:
                this._executeAttackBehavior();
                break;
                
            case EnemyAIState.FLEE:
                this._executeFleeingBehavior();
                break;
        }
    }
    
    /**
     * 更新空闲状态
     */
    private _updateIdleState(): void {
        // 检查是否发现玩家
        if (this._canSeePlayer()) {
            // 如果是主动攻击型敌人，则直接追击
            if (this.isAggressive) {
                this._setAIState(EnemyAIState.CHASE);
                return;
            }
        }
        
        // 随机决定是否开始巡逻
        if (Math.random() < 0.3) { // 30%概率开始巡逻
            this._setAIState(EnemyAIState.PATROL);
        }
    }
    
    /**
     * 更新巡逻状态
     */
    private _updatePatrolState(): void {
        // 检查是否发现玩家
        if (this._canSeePlayer()) {
            // 如果是主动攻击型敌人，则直接追击
            if (this.isAggressive) {
                this._setAIState(EnemyAIState.CHASE);
                return;
            }
        }
        
        // 如果没有巡逻点，则返回空闲状态
        if (this._patrolPoints.length === 0) {
            this._setAIState(EnemyAIState.IDLE);
            return;
        }
        
        // 如果正在等待，则继续等待
        if (this._isWaitingAtPatrol) {
            return;
        }
        
        // 检查是否到达当前巡逻点
        const currentPatrolPoint = this._patrolPoints[this._currentPatrolIndex];
        const distanceToPoint = Vec3.distance(this.node.position, currentPatrolPoint);
        
        if (distanceToPoint < 0.5) { // 认为已到达巡逻点
            // 开始等待
            this._isWaitingAtPatrol = true;
            this._patrolWaitTimer = this._patrolWaitTime;
            
            // 切换到下一个巡逻点
            this._currentPatrolIndex = (this._currentPatrolIndex + 1) % this._patrolPoints.length;
        }
    }
    
    /**
     * 更新追击状态
     */
    private _updateChaseState(): void {
        // 如果没有目标玩家，则返回空闲状态
        if (!this._targetPlayer || !this._targetPlayer.isAlive()) {
            this._setAIState(EnemyAIState.IDLE);
            return;
        }
        
        // 计算与玩家的距离
        const distanceToPlayer = Vec3.distance(this.node.position, this._targetPlayer.node.position);
        
        // 如果玩家超出追击范围，则返回巡逻状态
        if (distanceToPlayer > this.chaseRange) {
            this._setAIState(EnemyAIState.PATROL);
            return;
        }
        
        // 如果在攻击范围内，则切换到攻击状态
        if (this._canAttackTarget()) {
            this._setAIState(EnemyAIState.ATTACK);
            return;
        }
        
        // 检查是否已经丢失玩家踪迹太久
        const currentTime = Date.now() / 1000;
        if (currentTime - this._lastPlayerSightingTime > this._playerTrackingLostTime) {
            // 丢失玩家踪迹，返回巡逻状态
            this._setAIState(EnemyAIState.PATROL);
            return;
        }
    }
    
    /**
     * 更新攻击状态
     */
    private _updateAttackState(): void {
        // 如果没有目标玩家或玩家已死亡，则返回空闲状态
        if (!this._targetPlayer || !this._targetPlayer.isAlive()) {
            this._setAIState(EnemyAIState.IDLE);
            return;
        }
        
        // 检查是否仍然可以攻击目标
        if (!this._canAttackTarget()) {
            // 如果不能攻击，则切换到追击状态
            this._setAIState(EnemyAIState.CHASE);
            return;
        }
    }
    
    /**
     * 更新逃跑状态
     */
    private _updateFleeState(): void {
        // 如果生命值恢复到一定程度，则停止逃跑
        if (this.getHealthPercent() > 0.3) { // 生命值超过30%则停止逃跑
            this._setAIState(EnemyAIState.IDLE);
            return;
        }
        
        // 如果已经逃离玩家足够远，则停止逃跑
        if (this._targetPlayer) {
            const distanceToPlayer = Vec3.distance(this.node.position, this._targetPlayer.node.position);
            if (distanceToPlayer > this.visionRange * 1.5) {
                this._setAIState(EnemyAIState.IDLE);
                return;
            }
        } else {
            // 如果没有目标玩家，则停止逃跑
            this._setAIState(EnemyAIState.IDLE);
            return;
        }
    }
    
    /**
     * 执行巡逻行为
     * @param dt 帧间隔时间
     */
    private _executePatrolBehavior(dt: number): void {
        // 如果正在等待，则更新等待时间
        if (this._isWaitingAtPatrol) {
            this._patrolWaitTimer -= dt;
            if (this._patrolWaitTimer <= 0) {
                this._isWaitingAtPatrol = false;
            } else {
                return;
            }
        }
        
        // 如果没有巡逻点，则返回
        if (this._patrolPoints.length === 0) {
            return;
        }
        
        // 设置巡逻速度
        this.attributes.moveSpeed = this.patrolSpeed;
        
        // 移动到当前巡逻点
        const currentPatrolPoint = this._patrolPoints[this._currentPatrolIndex];
        this.moveTo(currentPatrolPoint);
    }
    
    /**
     * 执行追击行为
     */
    private _executeChaseBehavior(): void {
        // 如果没有目标玩家，则返回
        if (!this._targetPlayer) {
            return;
        }
        
        // 设置追击速度
        this.attributes.moveSpeed = this.chaseSpeed;
        
        // 移动到玩家位置
        this.moveTo(this._targetPlayer.node.position);
        
        // 更新最后看到玩家的时间
        if (this._canSeePlayer()) {
            this._lastPlayerSightingTime = Date.now() / 1000;
        }
    }
    
    /**
     * 执行攻击行为
     */
    private _executeAttackBehavior(): void {
        // 如果没有目标玩家，则返回
        if (!this._targetPlayer) {
            return;
        }
        
        // 停止移动
        this.stopMoving();
        
        // 面向玩家
        this._faceTarget(this._targetPlayer.node.position);
        
        // 检查攻击冷却
        const currentTime = Date.now() / 1000;
        if (currentTime - this._lastAttackTime >= this.minAttackInterval) {
            // 执行攻击
            if (this.canRangedAttack && this._rangedAttackTimer <= 0 && 
                Vec3.distance(this.node.position, this._targetPlayer.node.position) <= this.rangedAttackRange) {
                // 执行远程攻击
                this._performRangedAttack();
            } else {
                // 执行近战攻击
                this.attack(this._targetPlayer);
            }
            
            // 更新最后攻击时间
            this._lastAttackTime = currentTime;
        }
    }
    
    /**
     * 执行逃跑行为
     */
    private _executeFleeingBehavior(): void {
        // 如果没有目标玩家，则返回
        if (!this._targetPlayer) {
            return;
        }
        
        // 计算逃跑方向（远离玩家）
        const direction = Vec3.subtract(new Vec3(), this.node.position, this._targetPlayer.node.position);
        direction.normalize();
        
        // 计算逃跑目标位置
        const fleeDistance = 10;
        const fleeTarget = Vec3.add(new Vec3(), this.node.position, Vec3.multiplyScalar(new Vec3(), direction, fleeDistance));
        
        // 移动到逃跑位置
        this.moveTo(fleeTarget);
    }
    
    /**
     * 设置AI状态
     * @param state 新状态
     */
    private _setAIState(state: EnemyAIState): void {
        // 如果状态没有变化，则返回
        if (this._aiState === state) {
            return;
        }
        
        // 退出当前状态
        this._exitCurrentAIState();
        
        // 更新状态
        this._aiState = state;
        
        // 进入新状态
        this._enterNewAIState();
        
        // 触发AI状态变化事件
        EventBus.getInstance().emit(EventType.ENEMY_AI_STATE_CHANGED, {
            enemy: this,
            oldState: this._aiState,
            newState: state
        });
        
        logger.debug(LogCategory.CHARACTER, `敌人AI状态变化: ${this.characterName}, ${this._aiState}`);
    }
    
    /**
     * 退出当前AI状态
     */
    private _exitCurrentAIState(): void {
        switch (this._aiState) {
            case EnemyAIState.PATROL:
                // 重置巡逻等待
                this._isWaitingAtPatrol = false;
                this._patrolWaitTimer = 0;
                break;
                
            case EnemyAIState.CHASE:
            case EnemyAIState.FLEE:
                // 停止移动
                this.stopMoving();
                break;
        }
    }
    
    /**
     * 进入新AI状态
     */
    private _enterNewAIState(): void {
        switch (this._aiState) {
            case EnemyAIState.IDLE:
                // 停止移动
                this.stopMoving();
                // 设置角色状态为空闲
                this.setState(CharacterState.IDLE);
                break;
                
            case EnemyAIState.PATROL:
                // 重置巡逻索引
                if (this._patrolPoints.length > 0 && Math.random() < 0.3) {
                    this._currentPatrolIndex = Math.floor(Math.random() * this._patrolPoints.length);
                }
                break;
                
            case EnemyAIState.CHASE:
                // 更新最后看到玩家的时间
                this._lastPlayerSightingTime = Date.now() / 1000;
                break;
                
            case EnemyAIState.ATTACK:
                // 停止移动
                this.stopMoving();
                break;
                
            case EnemyAIState.FLEE:
                // 设置逃跑速度（比追击速度快）
                this.attributes.moveSpeed = this.chaseSpeed * 1.2;
                break;
        }
    }
    
    /**
     * 查找目标玩家
     */
    private _findTargetPlayer(): void {
        // 如果已有目标玩家且玩家存活，则不需要重新查找
        if (this._targetPlayer && this._targetPlayer.isAlive()) {
            return;
        }
        
        // 获取当前场景中的玩家控制器
        const players = GameManager.getInstance().getCurrentScene().getComponentsInChildren(PlayerController);
        
        // 选择最近的玩家作为目标
        let nearestPlayer: PlayerController = null;
        let minDistance = Infinity;
        
        for (const player of players) {
            if (player.isAlive()) {
                const distance = Vec3.distance(this.node.position, player.node.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestPlayer = player;
                }
            }
        }
        
        this._targetPlayer = nearestPlayer;
    }
    
    /**
     * 检查是否能看到玩家
     */
    private _canSeePlayer(): boolean {
        // 如果没有目标玩家或玩家已死亡，则不能看到
        if (!this._targetPlayer || !this._targetPlayer.isAlive()) {
            return false;
        }
        
        // 计算与玩家的距离
        const distanceToPlayer = Vec3.distance(this.node.position, this._targetPlayer.node.position);
        
        // 如果玩家在视野范围内
        if (distanceToPlayer <= this.visionRange) {
            // TODO: 实现视线检测，检查是否有障碍物阻挡
            // 简化版本，直接返回true
            return true;
        }
        
        return false;
    }
    
    /**
     * 检查是否能听到玩家
     */
    private _canHearPlayer(): boolean {
        // 如果没有目标玩家或玩家已死亡，则不能听到
        if (!this._targetPlayer || !this._targetPlayer.isAlive()) {
            return false;
        }
        
        // 计算与玩家的距离
        const distanceToPlayer = Vec3.distance(this.node.position, this._targetPlayer.node.position);
        
        // 如果玩家在听觉范围内
        if (distanceToPlayer <= this.hearingRange) {
            // 如果玩家正在移动，则更容易被听到
            if (this._targetPlayer.getState() === CharacterState.MOVING) {
                return true;
            }
            
            // 如果玩家正在攻击，则更容易被听到
            if (this._targetPlayer.getState() === CharacterState.ATTACKING) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 检查是否可以攻击目标
     */
    private _canAttackTarget(): boolean {
        // 如果没有目标玩家或玩家已死亡，则不能攻击
        if (!this._targetPlayer || !this._targetPlayer.isAlive()) {
            return false;
        }
        
        // 计算与玩家的距离
        const distanceToPlayer = Vec3.distance(this.node.position, this._targetPlayer.node.position);
        
        // 如果是远程敌人且远程攻击冷却已结束
        if (this.canRangedAttack && this._rangedAttackTimer <= 0) {
            return distanceToPlayer <= this.rangedAttackRange;
        }
        
        // 近战攻击检查
        return distanceToPlayer <= this.attackTriggerRange;
    }
    
    /**
     * 面向目标
     * @param targetPosition 目标位置
     */
    private _faceTarget(targetPosition: Vec3): void {
        // 计算朝向目标的方向
        const direction = Vec3.subtract(new Vec3(), targetPosition, this.node.position);
        direction.normalize();
        
        // 更新朝向
        this._updateDirection(direction);
    }
    
    /**
     * 执行远程攻击
     */
    private _performRangedAttack(): void {
        // 如果没有目标玩家，则返回
        if (!this._targetPlayer) {
            return;
        }
        
        // 设置远程攻击冷却
        this._rangedAttackTimer = this.rangedAttackCooldown;
        
        // 设置攻击状态
        this.setState(CharacterState.ATTACKING);
        
        // TODO: 创建投射物或执行远程攻击效果
        
        // 计算伤害
        const damage = this._calculateDamage(this._targetPlayer);
        
        // 应用伤害
        this._targetPlayer.takeDamage(damage, this);
        
        // 触发远程攻击事件
        EventBus.getInstance().emit(EventType.ENEMY_RANGED_ATTACK, {
            enemy: this,
            target: this._targetPlayer,
            damage: damage
        });
        
        // 攻击动画完成后恢复状态
        this.scheduleOnce(() => {
            // 如果当前状态仍然是攻击状态，则恢复到空闲状态
            if (this._currentState === CharacterState.ATTACKING) {
                this.setState(CharacterState.IDLE);
            }
        }, 0.5); // 假设攻击动画持续0.5秒
    }
    
    /**
     * 玩家攻击事件回调
     * @param event 事件数据
     */
    private _onPlayerAttack(event: any): void {
        const { player, target } = event;
        
        // 如果玩家攻击的是自己，则被激怒
        if (target === this) {
            // 如果当前不是追击或攻击状态，则切换到追击状态
            if (this._aiState !== EnemyAIState.CHASE && this._aiState !== EnemyAIState.ATTACK) {
                this._targetPlayer = player;
                this._setAIState(EnemyAIState.CHASE);
            }
        }
        // 如果玩家攻击的是同伴，且在视野范围内，也会被激怒
        else if (target.faction === CharacterFaction.ENEMY) {
            const distanceToAttack = Vec3.distance(this.node.position, target.node.position);
            if (distanceToAttack <= this.visionRange) {
                // 如果当前不是追击或攻击状态，则切换到追击状态
                if (this._aiState !== EnemyAIState.CHASE && this._aiState !== EnemyAIState.ATTACK) {
                    this._targetPlayer = player;
                    this._setAIState(EnemyAIState.CHASE);
                }
            }
        }
    }
    
    /**
     * 游戏状态变化回调
     * @param event 事件数据
     */
    private _onGameStateChanged(event: any): void {
        // 根据游戏状态调整AI行为
        const { newState } = event;
        
        switch (newState) {
            case 'PLAYING':
                // 游戏进行中，启用AI
                this._aiEnabled = true;
                break;
                
            case 'PAUSED':
                // 游戏暂停，禁用AI
                this._aiEnabled = false;
                this.stopMoving();
                break;
                
            case 'GAME_OVER':
                // 游戏结束，禁用AI
                this._aiEnabled = false;
                this.stopMoving();
                break;
        }
    }
    
    /**
     * 受到伤害
     * @param damage 伤害值
     * @param attacker 攻击者
     */
    public takeDamage(damage: number, attacker?: BaseCharacter): void {
        // 调用基类的受伤逻辑
        super.takeDamage(damage, attacker);
        
        // 如果攻击者是玩家，则被激怒
        if (attacker && attacker instanceof PlayerController) {
            this._targetPlayer = attacker;
            
            // 根据生命值决定是追击还是逃跑
            if (this.getHealthPercent() < 0.2 && this.enemyType !== EnemyType.BOSS) {
                // 生命值过低且不是Boss，则逃跑
                this._setAIState(EnemyAIState.FLEE);
            } else {
                // 否则追击
                this._setAIState(EnemyAIState.CHASE);
            }
        }
        
        // 触发敌人受伤事件
        EventBus.getInstance().emit(EventType.ENEMY_HURT, {
            enemy: this,
            attacker: attacker,
            damage: damage,
            remainingHealth: this.attributes.currentHealth,
            healthPercent: this.getHealthPercent()
        });
    }
    
    /**
     * 死亡
     */
    public die(): void {
        // 调用基类的死亡逻辑
        super.die();
        
        // 设置AI状态为死亡
        this._setAIState(EnemyAIState.DEAD);
        
        // 触发敌人死亡事件
        EventBus.getInstance().emit(EventType.ENEMY_DEATH, {
            enemy: this,
            enemyType: this.enemyType
        });
        
        // 掉落物品或经验值
        this._dropLoot();
    }
    
    /**
     * 掉落物品
     */
    private _dropLoot(): void {
        // TODO: 实现物品掉落逻辑
        
        // 触发物品掉落事件
        EventBus.getInstance().emit(EventType.ENEMY_DROP_LOOT, {
            enemy: this,
            position: this.node.position.clone()
        });
    }
    
    /**
     * 设置敌人类型
     * @param type 敌人类型
     */
    public setEnemyType(type: EnemyType): void {
        this.enemyType = type;
        
        // 根据敌人类型调整属性
        switch (type) {
            case EnemyType.MELEE:
                // 近战敌人属性
                this.attributes.maxHealth = 100;
                this.attributes.attackPower = 10;
                this.attributes.defense = 5;
                this.attributes.moveSpeed = 3;
                this.canRangedAttack = false;
                break;
                
            case EnemyType.RANGED:
                // 远程敌人属性
                this.attributes.maxHealth = 80;
                this.attributes.attackPower = 8;
                this.attributes.defense = 3;
                this.attributes.moveSpeed = 2.5;
                this.canRangedAttack = true;
                this.rangedAttackRange = 6;
                break;
                
            case EnemyType.ELITE:
                // 精英敌人属性
                this.attributes.maxHealth = 200;
                this.attributes.attackPower = 15;
                this.attributes.defense = 8;
                this.attributes.moveSpeed = 2.8;
                this.canRangedAttack = Math.random() > 0.5; // 50%概率拥有远程攻击
                break;
                
            case EnemyType.BOSS:
                // Boss敌人属性
                this.attributes.maxHealth = 500;
                this.attributes.attackPower = 25;
                this.attributes.defense = 15;
                this.attributes.moveSpeed = 2.5;
                this.canRangedAttack = true;
                this.rangedAttackRange = 8;
                break;
        }
        
        // 重置当前生命值
        this.attributes.currentHealth = this.attributes.maxHealth;
        
        logger.info(LogCategory.CHARACTER, `设置敌人类型: ${this.characterName}, ${this.enemyType}`);
    }
    
    /**
     * 设置是否启用AI
     * @param enabled 是否启用
     */
    public setAIEnabled(enabled: boolean): void {
        this._aiEnabled = enabled;
        
        if (!enabled) {
            // 禁用AI时停止移动
            this.stopMoving();
        }
    }
    
    /**
     * 获取当前AI状态
     */
    public getAIState(): EnemyAIState {
        return this._aiState;
    }
}