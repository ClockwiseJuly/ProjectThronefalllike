import { _decorator, Component, Node, Vec3, Collider2D, RigidBody2D, Animation, Sprite, UITransform, v3 } from 'cc';
import { logger, LogCategory } from '../Core/Logger';
import { EventBus, EventType } from '../Core/EventBus';

/**
 * 角色状态枚举
 */
export enum CharacterState {
    /** 空闲状态 */
    IDLE = 'idle',
    /** 移动状态 */
    MOVING = 'moving',
    /** 攻击状态 */
    ATTACKING = 'attacking',
    /** 受伤状态 */
    HURT = 'hurt',
    /** 死亡状态 */
    DEAD = 'dead',
    /** 技能施放状态 */
    CASTING = 'casting',
    /** 眩晕状态 */
    STUNNED = 'stunned',
    /** 冻结状态 */
    FROZEN = 'frozen'
}

/**
 * 角色朝向枚举
 */
export enum CharacterDirection {
    /** 向上 */
    UP = 'up',
    /** 向下 */
    DOWN = 'down',
    /** 向左 */
    LEFT = 'left',
    /** 向右 */
    RIGHT = 'right'
}

/**
 * 角色阵营枚举
 */
export enum CharacterFaction {
    /** 玩家阵营 */
    PLAYER = 'player',
    /** 敌人阵营 */
    ENEMY = 'enemy',
    /** 中立阵营 */
    NEUTRAL = 'neutral',
    /** 友方阵营 */
    FRIENDLY = 'friendly'
}

/**
 * 角色属性接口
 */
export interface ICharacterAttributes {
    /** 最大生命值 */
    maxHealth: number;
    /** 当前生命值 */
    currentHealth: number;
    /** 移动速度 */
    moveSpeed: number;
    /** 攻击力 */
    attackPower: number;
    /** 防御力 */
    defense: number;
    /** 攻击速度 */
    attackSpeed: number;
    /** 攻击范围 */
    attackRange: number;
    /** 暴击率 */
    critRate: number;
    /** 暴击伤害倍率 */
    critDamage: number;
    /** 闪避率 */
    dodgeRate: number;
    /** 生命恢复速率 */
    healthRegen: number;
    /** 技能冷却减少 */
    cooldownReduction: number;
    /** 经验值加成 */
    expBonus: number;
    /** 金币加成 */
    goldBonus: number;
}

/**
 * 角色基类
 * 所有游戏中的角色（玩家、敌人、NPC等）都继承自此类
 */
export class BaseCharacter extends Component {
    /** 角色名称 */
    public characterName: string = 'Unknown';
    /** 角色阵营 */
    public faction: CharacterFaction = CharacterFaction.NEUTRAL;
    /** 角色等级 */
    public level: number = 1;
    /** 角色属性 */
    public attributes: ICharacterAttributes = {
        maxHealth: 100,
        currentHealth: 100,
        moveSpeed: 5,
        attackPower: 10,
        defense: 5,
        attackSpeed: 1,
        attackRange: 1,
        critRate: 0.05,
        critDamage: 1.5,
        dodgeRate: 0.05,
        healthRegen: 1,
        cooldownReduction: 0,
        expBonus: 0,
        goldBonus: 0
    };
    
    /** 当前状态 */
    protected _currentState: CharacterState = CharacterState.IDLE;
    /** 当前朝向 */
    protected _currentDirection: CharacterDirection = CharacterDirection.DOWN;
    /** 是否可以移动 */
    protected _canMove: boolean = true;
    /** 是否可以攻击 */
    protected _canAttack: boolean = true;
    /** 是否无敌 */
    protected _isInvincible: boolean = false;
    /** 无敌时间计时器 */
    protected _invincibleTimer: number = 0;
    /** 攻击冷却计时器 */
    protected _attackCooldown: number = 0;
    /** 技能冷却计时器映射表 */
    protected _skillCooldowns: Map<string, number> = new Map();
    /** 状态效果列表 */
    protected _statusEffects: Map<string, any> = new Map();
    
    /** 碰撞体组件 */
    protected _collider: Collider2D = null;
    /** 刚体组件 */
    protected _rigidbody: RigidBody2D = null;
    /** 动画组件 */
    protected _animation: Animation = null;
    /** 精灵组件 */
    protected _sprite: Sprite = null;
    /** UI变换组件 */
    protected _transform: UITransform = null;
    
    /** 移动目标位置 */
    protected _moveTarget: Vec3 = null;
    /** 移动方向 */
    protected _moveDirection: Vec3 = Vec3.ZERO.clone();
    /** 是否正在移动 */
    protected _isMoving: boolean = false;
    
    /**
     * 组件加载时调用
     */
    protected onLoad(): void {
        // 获取组件引用
        this._collider = this.getComponent(Collider2D);
        this._rigidbody = this.getComponent(RigidBody2D);
        this._animation = this.getComponent(Animation);
        this._sprite = this.getComponent(Sprite);
        this._transform = this.getComponent(UITransform);
        
        // 初始化角色
        this.initialize();
    }
    
    /**
     * 组件启用时调用
     */
    protected onEnable(): void {
        // 注册事件监听
        this._registerEvents();
    }
    
    /**
     * 组件禁用时调用
     */
    protected onDisable(): void {
        // 注销事件监听
        this._unregisterEvents();
    }
    
    /**
     * 每帧更新时调用
     * @param dt 帧间隔时间
     */
    protected update(dt: number): void {
        // 更新状态效果
        this._updateStatusEffects(dt);
        
        // 更新冷却时间
        this._updateCooldowns(dt);
        
        // 更新移动
        this._updateMovement(dt);
        
        // 更新生命恢复
        this._updateHealthRegen(dt);
    }
    
    /**
     * 初始化角色
     */
    public initialize(): void {
        // 重置状态
        this._currentState = CharacterState.IDLE;
        this._canMove = true;
        this._canAttack = true;
        this._isInvincible = false;
        this._invincibleTimer = 0;
        this._attackCooldown = 0;
        this._skillCooldowns.clear();
        this._statusEffects.clear();
        
        // 重置属性
        this.attributes.currentHealth = this.attributes.maxHealth;
        
        logger.info(LogCategory.CHARACTER, `初始化角色: ${this.characterName}`);
    }
    
    /**
     * 注册事件监听
     */
    protected _registerEvents(): void {
        // 子类实现
    }
    
    /**
     * 注销事件监听
     */
    protected _unregisterEvents(): void {
        // 子类实现
    }
    
    /**
     * 更新状态效果
     * @param dt 帧间隔时间
     */
    protected _updateStatusEffects(dt: number): void {
        // 遍历所有状态效果
        this._statusEffects.forEach((effect, id) => {
            // 更新状态效果持续时间
            effect.duration -= dt;
            
            // 如果状态效果已过期，则移除
            if (effect.duration <= 0) {
                // 移除状态效果
                this._removeStatusEffect(id);
            }
        });
    }
    
    /**
     * 更新冷却时间
     * @param dt 帧间隔时间
     */
    protected _updateCooldowns(dt: number): void {
        // 更新攻击冷却
        if (this._attackCooldown > 0) {
            this._attackCooldown -= dt;
            if (this._attackCooldown <= 0) {
                this._attackCooldown = 0;
                this._canAttack = true;
            }
        }
        
        // 更新技能冷却
        this._skillCooldowns.forEach((cooldown, skillId) => {
            if (cooldown > 0) {
                // 应用冷却减少效果
                const reduction = 1 + this.attributes.cooldownReduction;
                const reducedCooldown = cooldown - (dt * reduction);
                
                if (reducedCooldown <= 0) {
                    this._skillCooldowns.set(skillId, 0);
                    // 触发技能冷却完成事件
                    this._onSkillCooldownComplete(skillId);
                } else {
                    this._skillCooldowns.set(skillId, reducedCooldown);
                }
            }
        });
        
        // 更新无敌时间
        if (this._isInvincible && this._invincibleTimer > 0) {
            this._invincibleTimer -= dt;
            if (this._invincibleTimer <= 0) {
                this._isInvincible = false;
                this._invincibleTimer = 0;
                // 触发无敌结束事件
                this._onInvincibleEnd();
            }
        }
    }
    
    /**
     * 更新移动
     * @param dt 帧间隔时间
     */
    protected _updateMovement(dt: number): void {
        // 如果不能移动或没有移动目标，则返回
        if (!this._canMove || !this._isMoving) {
            return;
        }
        
        // 计算移动距离
        const moveDistance = this.attributes.moveSpeed * dt;
        
        // 如果有移动目标
        if (this._moveTarget) {
            // 计算到目标的向量
            const currentPos = this.node.position;
            const direction = Vec3.subtract(new Vec3(), this._moveTarget, currentPos);
            
            // 计算距离
            const distance = direction.length();
            
            // 如果已经到达目标附近，则停止移动
            if (distance <= moveDistance) {
                this.node.position = this._moveTarget.clone();
                this._moveTarget = null;
                this._isMoving = false;
                this._onMoveComplete();
                return;
            }
            
            // 标准化方向向量
            direction.normalize();
            this._moveDirection = direction;
            
            // 更新朝向
            this._updateDirection(direction);
        }
        
        // 应用移动
        const movement = Vec3.multiplyScalar(new Vec3(), this._moveDirection, moveDistance);
        this.node.position = Vec3.add(new Vec3(), this.node.position, movement);
    }
    
    /**
     * 更新生命恢复
     * @param dt 帧间隔时间
     */
    protected _updateHealthRegen(dt: number): void {
        // 如果已死亡，则不恢复生命
        if (this._currentState === CharacterState.DEAD) {
            return;
        }
        
        // 计算恢复量
        const regenAmount = this.attributes.healthRegen * dt;
        
        // 应用生命恢复
        if (regenAmount > 0) {
            this.heal(regenAmount);
        }
    }
    
    /**
     * 更新朝向
     * @param direction 方向向量
     */
    protected _updateDirection(direction: Vec3): void {
        // 根据移动方向确定角色朝向
        if (Math.abs(direction.x) > Math.abs(direction.y)) {
            // 水平方向移动
            if (direction.x > 0) {
                this._currentDirection = CharacterDirection.RIGHT;
            } else {
                this._currentDirection = CharacterDirection.LEFT;
            }
        } else {
            // 垂直方向移动
            if (direction.y > 0) {
                this._currentDirection = CharacterDirection.UP;
            } else {
                this._currentDirection = CharacterDirection.DOWN;
            }
        }
        
        // 更新动画
        this._updateAnimation();
    }
    
    /**
     * 更新动画
     */
    protected _updateAnimation(): void {
        // 如果没有动画组件，则返回
        if (!this._animation) {
            return;
        }
        
        // 构建动画名称
        const animName = `${this._currentState}_${this._currentDirection}`;
        
        // 播放动画
        if (this._animation.clips.find(clip => clip.name === animName)) {
            this._animation.play(animName);
        } else {
            // 如果没有找到对应的动画，则播放默认动画
            const defaultAnimName = `${this._currentState}_down`;
            if (this._animation.clips.find(clip => clip.name === defaultAnimName)) {
                this._animation.play(defaultAnimName);
            }
        }
    }
    
    /**
     * 移动到指定位置
     * @param position 目标位置
     */
    public moveTo(position: Vec3): void {
        // 如果不能移动或已死亡，则返回
        if (!this._canMove || this._currentState === CharacterState.DEAD) {
            return;
        }
        
        // 设置移动目标
        this._moveTarget = position.clone();
        
        // 计算移动方向
        const direction = Vec3.subtract(new Vec3(), this._moveTarget, this.node.position);
        direction.normalize();
        this._moveDirection = direction;
        
        // 更新朝向
        this._updateDirection(direction);
        
        // 设置移动状态
        this._isMoving = true;
        this.setState(CharacterState.MOVING);
    }
    
    /**
     * 停止移动
     */
    public stopMoving(): void {
        this._isMoving = false;
        this._moveTarget = null;
        this._moveDirection = Vec3.ZERO.clone();
        
        // 如果当前状态是移动，则切换到空闲状态
        if (this._currentState === CharacterState.MOVING) {
            this.setState(CharacterState.IDLE);
        }
    }
    
    /**
     * 设置移动方向
     * @param direction 方向向量
     */
    public setMoveDirection(direction: Vec3): void {
        // 如果不能移动或已死亡，则返回
        if (!this._canMove || this._currentState === CharacterState.DEAD) {
            return;
        }
        
        // 标准化方向向量
        if (!Vec3.equals(direction, Vec3.ZERO)) {
            Vec3.normalize(direction, direction);
            this._moveDirection = direction.clone();
            this._isMoving = true;
            this.setState(CharacterState.MOVING);
            
            // 更新朝向
            this._updateDirection(direction);
        } else {
            this._isMoving = false;
            
            // 如果当前状态是移动，则切换到空闲状态
            if (this._currentState === CharacterState.MOVING) {
                this.setState(CharacterState.IDLE);
            }
        }
        
        // 清除移动目标
        this._moveTarget = null;
    }
    
    /**
     * 攻击
     * @param target 攻击目标
     */
    public attack(target: BaseCharacter): void {
        // 如果不能攻击或已死亡或正在攻击，则返回
        if (!this._canAttack || 
            this._currentState === CharacterState.DEAD || 
            this._currentState === CharacterState.ATTACKING) {
            return;
        }
        
        // 如果攻击冷却未结束，则返回
        if (this._attackCooldown > 0) {
            return;
        }
        
        // 计算与目标的距离
        const distance = Vec3.distance(this.node.position, target.node.position);
        
        // 如果目标超出攻击范围，则返回
        if (distance > this.attributes.attackRange) {
            return;
        }
        
        // 设置攻击状态
        this.setState(CharacterState.ATTACKING);
        
        // 设置攻击冷却
        this._attackCooldown = 1 / this.attributes.attackSpeed;
        this._canAttack = false;
        
        // 计算朝向目标的方向
        const direction = Vec3.subtract(new Vec3(), target.node.position, this.node.position);
        direction.normalize();
        
        // 更新朝向
        this._updateDirection(direction);
        
        // 执行攻击逻辑
        this._performAttack(target);
    }
    
    /**
     * 执行攻击逻辑
     * @param target 攻击目标
     */
    protected _performAttack(target: BaseCharacter): void {
        // 计算伤害
        const damage = this._calculateDamage(target);
        
        // 应用伤害
        target.takeDamage(damage, this);
        
        // 触发攻击事件
        EventBus.getInstance().emit(EventType.CHARACTER_ATTACK, {
            attacker: this,
            target: target,
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
     * 计算伤害
     * @param target 攻击目标
     */
    protected _calculateDamage(target: BaseCharacter): number {
        // 基础伤害
        let damage = this.attributes.attackPower;
        
        // 计算暴击
        let isCritical = false;
        if (Math.random() < this.attributes.critRate) {
            damage *= this.attributes.critDamage;
            isCritical = true;
        }
        
        // 计算目标防御减伤
        const damageReduction = target.attributes.defense / (target.attributes.defense + 100);
        damage *= (1 - damageReduction);
        
        // 应用随机波动 (±10%)
        const randomFactor = 0.9 + Math.random() * 0.2;
        damage *= randomFactor;
        
        // 取整
        damage = Math.max(1, Math.floor(damage));
        
        // 如果是暴击，触发暴击事件
        if (isCritical) {
            EventBus.getInstance().emit(EventType.CHARACTER_CRITICAL_HIT, {
                attacker: this,
                target: target,
                damage: damage
            });
        }
        
        return damage;
    }
    
    /**
     * 受到伤害
     * @param damage 伤害值
     * @param attacker 攻击者
     */
    public takeDamage(damage: number, attacker?: BaseCharacter): void {
        // 如果已死亡或处于无敌状态，则不受伤害
        if (this._currentState === CharacterState.DEAD || this._isInvincible) {
            return;
        }
        
        // 计算闪避
        if (Math.random() < this.attributes.dodgeRate) {
            // 触发闪避事件
            EventBus.getInstance().emit(EventType.CHARACTER_DODGE, {
                character: this,
                attacker: attacker
            });
            
            return;
        }
        
        // 应用伤害
        this.attributes.currentHealth -= damage;
        
        // 触发受伤事件
        EventBus.getInstance().emit(EventType.CHARACTER_HURT, {
            character: this,
            attacker: attacker,
            damage: damage
        });
        
        // 设置受伤状态
        this.setState(CharacterState.HURT);
        
        // 短暂无敌时间
        this._isInvincible = true;
        this._invincibleTimer = 0.5; // 0.5秒无敌时间
        
        // 检查是否死亡
        if (this.attributes.currentHealth <= 0) {
            this.attributes.currentHealth = 0;
            this.die();
        } else {
            // 受伤动画完成后恢复状态
            this.scheduleOnce(() => {
                // 如果当前状态仍然是受伤状态，则恢复到空闲状态
                if (this._currentState === CharacterState.HURT) {
                    this.setState(CharacterState.IDLE);
                }
            }, 0.3); // 假设受伤动画持续0.3秒
        }
    }
    
    /**
     * 治疗
     * @param amount 治疗量
     */
    public heal(amount: number): void {
        // 如果已死亡，则不能治疗
        if (this._currentState === CharacterState.DEAD) {
            return;
        }
        
        // 应用治疗
        this.attributes.currentHealth = Math.min(
            this.attributes.currentHealth + amount,
            this.attributes.maxHealth
        );
        
        // 触发治疗事件
        EventBus.getInstance().emit(EventType.CHARACTER_HEAL, {
            character: this,
            amount: amount
        });
    }
    
    /**
     * 死亡
     */
    public die(): void {
        // 如果已经是死亡状态，则返回
        if (this._currentState === CharacterState.DEAD) {
            return;
        }
        
        // 设置死亡状态
        this.setState(CharacterState.DEAD);
        
        // 停止移动
        this.stopMoving();
        
        // 禁用移动和攻击
        this._canMove = false;
        this._canAttack = false;
        
        // 触发死亡事件
        EventBus.getInstance().emit(EventType.CHARACTER_DEATH, {
            character: this
        });
        
        logger.info(LogCategory.CHARACTER, `角色死亡: ${this.characterName}`);
    }
    
    /**
     * 复活
     * @param healthPercent 复活后的生命值百分比 (0-1)
     */
    public revive(healthPercent: number = 0.5): void {
        // 如果不是死亡状态，则返回
        if (this._currentState !== CharacterState.DEAD) {
            return;
        }
        
        // 恢复生命值
        this.attributes.currentHealth = Math.floor(this.attributes.maxHealth * healthPercent);
        
        // 恢复移动和攻击能力
        this._canMove = true;
        this._canAttack = true;
        
        // 设置为空闲状态
        this.setState(CharacterState.IDLE);
        
        // 触发复活事件
        EventBus.getInstance().emit(EventType.CHARACTER_REVIVE, {
            character: this,
            healthPercent: healthPercent
        });
        
        logger.info(LogCategory.CHARACTER, `角色复活: ${this.characterName}`);
    }
    
    /**
     * 添加状态效果
     * @param id 效果ID
     * @param effect 效果数据
     */
    public addStatusEffect(id: string, effect: any): void {
        // 如果已死亡，则不添加状态效果
        if (this._currentState === CharacterState.DEAD) {
            return;
        }
        
        // 如果已存在相同ID的效果，则先移除
        if (this._statusEffects.has(id)) {
            this._removeStatusEffect(id);
        }
        
        // 添加效果
        this._statusEffects.set(id, effect);
        
        // 应用效果
        if (effect.onApply) {
            effect.onApply(this);
        }
        
        // 触发状态效果添加事件
        EventBus.getInstance().emit(EventType.CHARACTER_STATUS_EFFECT_ADDED, {
            character: this,
            effectId: id,
            effect: effect
        });
        
        logger.debug(LogCategory.CHARACTER, `添加状态效果: ${this.characterName}, ${id}, 持续时间: ${effect.duration}秒`);
    }
    
    /**
     * 移除状态效果
     * @param id 效果ID
     */
    protected _removeStatusEffect(id: string): void {
        // 获取效果
        const effect = this._statusEffects.get(id);
        
        if (!effect) {
            return;
        }
        
        // 应用效果移除回调
        if (effect.onRemove) {
            effect.onRemove(this);
        }
        
        // 移除效果
        this._statusEffects.delete(id);
        
        // 触发状态效果移除事件
        EventBus.getInstance().emit(EventType.CHARACTER_STATUS_EFFECT_REMOVED, {
            character: this,
            effectId: id,
            effect: effect
        });
        
        logger.debug(LogCategory.CHARACTER, `移除状态效果: ${this.characterName}, ${id}`);
    }
    
    /**
     * 清除所有状态效果
     */
    public clearStatusEffects(): void {
        // 获取所有效果ID
        const effectIds = Array.from(this._statusEffects.keys());
        
        // 移除每个效果
        effectIds.forEach(id => {
            this._removeStatusEffect(id);
        });
        
        logger.debug(LogCategory.CHARACTER, `清除所有状态效果: ${this.characterName}`);
    }
    
    /**
     * 设置技能冷却
     * @param skillId 技能ID
     * @param cooldown 冷却时间（秒）
     */
    public setSkillCooldown(skillId: string, cooldown: number): void {
        this._skillCooldowns.set(skillId, cooldown);
    }
    
    /**
     * 获取技能冷却
     * @param skillId 技能ID
     */
    public getSkillCooldown(skillId: string): number {
        return this._skillCooldowns.get(skillId) || 0;
    }
    
    /**
     * 技能冷却完成回调
     * @param skillId 技能ID
     */
    protected _onSkillCooldownComplete(skillId: string): void {
        // 触发技能冷却完成事件
        EventBus.getInstance().emit(EventType.CHARACTER_SKILL_COOLDOWN_COMPLETE, {
            character: this,
            skillId: skillId
        });
    }
    
    /**
     * 无敌结束回调
     */
    protected _onInvincibleEnd(): void {
        // 触发无敌结束事件
        EventBus.getInstance().emit(EventType.CHARACTER_INVINCIBLE_END, {
            character: this
        });
    }
    
    /**
     * 移动完成回调
     */
    protected _onMoveComplete(): void {
        // 触发移动完成事件
        EventBus.getInstance().emit(EventType.CHARACTER_MOVE_COMPLETE, {
            character: this
        });
    }
    
    /**
     * 设置状态
     * @param state 新状态
     */
    public setState(state: CharacterState): void {
        // 如果状态没有变化，则返回
        if (this._currentState === state) {
            return;
        }
        
        // 保存旧状态
        const oldState = this._currentState;
        
        // 更新状态
        this._currentState = state;
        
        // 更新动画
        this._updateAnimation();
        
        // 触发状态变化事件
        EventBus.getInstance().emit(EventType.CHARACTER_STATE_CHANGED, {
            character: this,
            oldState: oldState,
            newState: state
        });
    }
    
    /**
     * 获取当前状态
     */
    public getState(): CharacterState {
        return this._currentState;
    }
    
    /**
     * 获取当前朝向
     */
    public getDirection(): CharacterDirection {
        return this._currentDirection;
    }
    
    /**
     * 是否处于指定状态
     * @param state 状态
     */
    public isInState(state: CharacterState): boolean {
        return this._currentState === state;
    }
    
    /**
     * 是否存活
     */
    public isAlive(): boolean {
        return this._currentState !== CharacterState.DEAD;
    }
    
    /**
     * 是否可以移动
     */
    public canMove(): boolean {
        return this._canMove && this._currentState !== CharacterState.DEAD;
    }
    
    /**
     * 是否可以攻击
     */
    public canAttack(): boolean {
        return this._canAttack && this._currentState !== CharacterState.DEAD && this._attackCooldown <= 0;
    }
    
    /**
     * 是否处于无敌状态
     */
    public isInvincible(): boolean {
        return this._isInvincible;
    }
    
    /**
     * 设置无敌状态
     * @param invincible 是否无敌
     * @param duration 持续时间（秒）
     */
    public setInvincible(invincible: boolean, duration: number = 0): void {
        this._isInvincible = invincible;
        
        if (invincible && duration > 0) {
            this._invincibleTimer = duration;
        } else {
            this._invincibleTimer = 0;
        }
    }
    
    /**
     * 获取生命值百分比
     */
    public getHealthPercent(): number {
        return this.attributes.currentHealth / this.attributes.maxHealth;
    }
    
    /**
     * 设置属性值
     * @param key 属性名
     * @param value 属性值
     */
    public setAttribute(key: keyof ICharacterAttributes, value: number): void {
        if (key in this.attributes) {
            this.attributes[key] = value;
            
            // 如果修改了最大生命值，则同比例调整当前生命值
            if (key === 'maxHealth') {
                const healthPercent = this.attributes.currentHealth / (value - this.attributes[key]);
                this.attributes.currentHealth = Math.floor(value * healthPercent);
            }
            
            // 触发属性变化事件
            EventBus.getInstance().emit(EventType.CHARACTER_ATTRIBUTE_CHANGED, {
                character: this,
                attributeKey: key,
                oldValue: this.attributes[key],
                newValue: value
            });
        }
    }
    
    /**
     * 修改属性值（增加或减少）
     * @param key 属性名
     * @param delta 变化值
     */
    public modifyAttribute(key: keyof ICharacterAttributes, delta: number): void {
        if (key in this.attributes) {
            const oldValue = this.attributes[key];
            const newValue = oldValue + delta;
            
            this.setAttribute(key, newValue);
        }
    }
    
    /**
     * 获取属性值
     * @param key 属性名
     */
    public getAttribute(key: keyof ICharacterAttributes): number {
        return this.attributes[key];
    }
}