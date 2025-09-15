import { _decorator, Vec2, Node } from 'cc';
import { logger, LogCategory } from '../Core/Logger';
import { eventBus, EventType } from '../Core/EventBus';
import { resourceManager } from '../Core/ResourceManager';
import { gameState } from '../Core/GameState';
import { saveManager } from '../Core/SaveManager';
import { BaseCharacter, CharacterCamp } from '../Character/BaseCharacter';
import { PlayerController } from '../Character/PlayerController';
import { combatSystem } from './CombatSystem';

/**
 * 武器类型枚举
 */
export enum WeaponType {
    /** 近战武器 */
    MELEE = 'melee',
    /** 远程武器 */
    RANGED = 'ranged',
    /** 魔法武器 */
    MAGIC = 'magic'
}

/**
 * 武器稀有度枚举
 */
export enum WeaponRarity {
    /** 普通 */
    COMMON = 'common',
    /** 稀有 */
    RARE = 'rare',
    /** 史诗 */
    EPIC = 'epic',
    /** 传说 */
    LEGENDARY = 'legendary'
}

/**
 * 武器信息接口
 */
export interface IWeaponInfo {
    /** 武器ID */
    id: string;
    /** 武器类型 */
    type: WeaponType;
    /** 武器稀有度 */
    rarity: WeaponRarity;
    /** 武器名称 */
    name: string;
    /** 武器描述 */
    description: string;
    /** 武器图标路径 */
    iconPath: string;
    /** 武器模型路径 */
    modelPath: string;
    /** 武器属性 */
    attributes: {
        /** 基础伤害 */
        baseDamage: number;
        /** 攻击速度 */
        attackSpeed: number;
        /** 攻击范围 */
        attackRange: number;
        /** 暴击率 */
        critRate: number;
        /** 暴击伤害 */
        critDamage: number;
    };
    /** 武器特效 */
    effects?: any[];
    /** 解锁条件 */
    unlockCondition?: string;
}

/**
 * 技能类型枚举
 */
export enum SkillType {
    /** 主动技能 */
    ACTIVE = 'active',
    /** 被动技能 */
    PASSIVE = 'passive',
    /** 终极技能 */
    ULTIMATE = 'ultimate'
}

/**
 * 技能信息接口
 */
export interface ISkillInfo {
    /** 技能ID */
    id: string;
    /** 技能类型 */
    type: SkillType;
    /** 技能名称 */
    name: string;
    /** 技能描述 */
    description: string;
    /** 技能图标路径 */
    iconPath: string;
    /** 技能效果路径 */
    effectPath: string;
    /** 技能冷却时间（秒） */
    cooldown: number;
    /** 技能消耗 */
    cost?: number;
    /** 技能等级 */
    level: number;
    /** 最大等级 */
    maxLevel: number;
    /** 技能数据（随等级变化） */
    levelData: any[];
    /** 解锁条件 */
    unlockCondition?: string;
}

/**
 * 升级选项类型枚举
 */
export enum UpgradeOptionType {
    /** 武器升级 */
    WEAPON = 'weapon',
    /** 技能升级 */
    SKILL = 'skill',
    /** 属性升级 */
    ATTRIBUTE = 'attribute',
    /** 特殊能力 */
    ABILITY = 'ability'
}

/**
 * 升级选项接口
 */
export interface IUpgradeOption {
    /** 选项类型 */
    type: UpgradeOptionType;
    /** 选项ID */
    id: string;
    /** 选项名称 */
    name: string;
    /** 选项描述 */
    description: string;
    /** 选项图标路径 */
    iconPath: string;
    /** 选项数据 */
    data: any;
}

/**
 * 永久升级项接口
 */
export interface IPermanentUpgrade {
    /** 升级ID */
    id: string;
    /** 升级名称 */
    name: string;
    /** 升级描述 */
    description: string;
    /** 升级图标路径 */
    iconPath: string;
    /** 升级等级 */
    level: number;
    /** 最大等级 */
    maxLevel: number;
    /** 升级成本 */
    cost: number;
    /** 升级效果 */
    effect: any;
}

/**
 * 肉鸽系统
 * 负责管理肉鸽模式的武器、技能、升级等内容
 */
export class RoguelikeSystem {
    private static _instance: RoguelikeSystem = null;
    
    /** 武器配置信息 */
    private _weaponConfigs: Map<string, IWeaponInfo> = new Map();
    /** 技能配置信息 */
    private _skillConfigs: Map<string, ISkillInfo> = new Map();
    /** 永久升级项配置 */
    private _permanentUpgrades: Map<string, IPermanentUpgrade> = new Map();
    
    /** 当前装备的武器 */
    private _equippedWeapon: IWeaponInfo = null;
    /** 当前解锁的武器 */
    private _unlockedWeapons: Set<string> = new Set();
    /** 当前解锁的技能 */
    private _unlockedSkills: Set<string> = new Set();
    /** 当前装备的技能 */
    private _equippedSkills: Map<string, ISkillInfo> = new Map();
    /** 当前技能冷却状态 */
    private _skillCooldowns: Map<string, number> = new Map();
    
    /** 当前经验值 */
    private _experience: number = 0;
    /** 当前等级 */
    private _level: number = 1;
    /** 升级所需经验值 */
    private _experienceToNextLevel: number = 100;
    /** 可用升级点数 */
    private _upgradePoints: number = 0;
    
    /** 永久货币（灵魂碎片） */
    private _soulShards: number = 0;
    /** 已购买的永久升级 */
    private _purchasedPermanentUpgrades: Map<string, number> = new Map();
    
    /** 是否启用肉鸽模式 */
    private _roguelikeEnabled: boolean = false;
    /** 当前运行状态 */
    private _isRunning: boolean = false;
    
    /**
     * 获取单例实例
     */
    public static getInstance(): RoguelikeSystem {
        if (!this._instance) {
            this._instance = new RoguelikeSystem();
        }
        return this._instance;
    }
    
    /**
     * 私有构造函数
     */
    private constructor() {
        this._initialize();
    }
    
    /**
     * 初始化肉鸽系统
     */
    private _initialize(): void {
        logger.info(LogCategory.ROGUELIKE, '肉鸽系统初始化');
        
        // 注册事件监听
        this._registerEvents();
        
        // 初始化武器配置
        this._initWeaponConfigs();
        
        // 初始化技能配置
        this._initSkillConfigs();
        
        // 初始化永久升级项
        this._initPermanentUpgrades();
        
        // 加载永久升级数据
        this._loadPermanentUpgradeData();
    }
    
    /**
     * 注册事件监听
     */
    private _registerEvents(): void {
        // 游戏状态变化事件
        eventBus.on(EventType.GAME_STATE_CHANGED, this._onGameStateChanged, this);
        // 日夜切换事件
        eventBus.on(EventType.DAY_NIGHT_CHANGED, this._onDayNightChanged, this);
        // 敌人死亡事件
        eventBus.on(EventType.CHARACTER_DIED, this._onEnemyDied, this);
        // 玩家受伤事件
        eventBus.on(EventType.PLAYER_DAMAGED, this._onPlayerDamaged, this);
        // 玩家使用技能事件
        eventBus.on(EventType.PLAYER_USE_SKILL, this._onPlayerUseSkill, this);
    }
    
    /**
     * 初始化武器配置
     */
    private _initWeaponConfigs(): void {
        // 近战武器 - 普通剑
        this._weaponConfigs.set('sword_common', {
            id: 'sword_common',
            type: WeaponType.MELEE,
            rarity: WeaponRarity.COMMON,
            name: '普通剑',
            description: '基础的近战武器，适合初学者使用',
            iconPath: 'textures/ui/weapons/sword_common_icon',
            modelPath: 'models/weapons/sword_common',
            attributes: {
                baseDamage: 10,
                attackSpeed: 1.0,
                attackRange: 1.5,
                critRate: 0.05,
                critDamage: 1.5
            }
        });
        
        // 近战武器 - 稀有斧
        this._weaponConfigs.set('axe_rare', {
            id: 'axe_rare',
            type: WeaponType.MELEE,
            rarity: WeaponRarity.RARE,
            name: '稀有斧',
            description: '沉重但威力强大的斧头，能造成更高的伤害',
            iconPath: 'textures/ui/weapons/axe_rare_icon',
            modelPath: 'models/weapons/axe_rare',
            attributes: {
                baseDamage: 18,
                attackSpeed: 0.8,
                attackRange: 1.8,
                critRate: 0.08,
                critDamage: 1.8
            },
            effects: [
                { type: 'bleed', chance: 0.2, damage: 3, duration: 3 }
            ],
            unlockCondition: '击败10个敌人'
        });
        
        // 远程武器 - 普通弓
        this._weaponConfigs.set('bow_common', {
            id: 'bow_common',
            type: WeaponType.RANGED,
            rarity: WeaponRarity.COMMON,
            name: '普通弓',
            description: '基础的远程武器，可以从安全距离攻击敌人',
            iconPath: 'textures/ui/weapons/bow_common_icon',
            modelPath: 'models/weapons/bow_common',
            attributes: {
                baseDamage: 8,
                attackSpeed: 0.9,
                attackRange: 8.0,
                critRate: 0.1,
                critDamage: 1.6
            }
        });
        
        // 魔法武器 - 稀有法杖
        this._weaponConfigs.set('staff_rare', {
            id: 'staff_rare',
            type: WeaponType.MAGIC,
            rarity: WeaponRarity.RARE,
            name: '稀有法杖',
            description: '蕴含魔法能量的法杖，可以发射魔法弹',
            iconPath: 'textures/ui/weapons/staff_rare_icon',
            modelPath: 'models/weapons/staff_rare',
            attributes: {
                baseDamage: 12,
                attackSpeed: 1.2,
                attackRange: 6.0,
                critRate: 0.07,
                critDamage: 1.7
            },
            effects: [
                { type: 'elemental', element: 'fire', damage: 4, chance: 0.3 }
            ],
            unlockCondition: '使用魔法击败15个敌人'
        });
    }
    
    /**
     * 初始化技能配置
     */
    private _initSkillConfigs(): void {
        // 主动技能 - 旋风斩
        this._skillConfigs.set('whirlwind', {
            id: 'whirlwind',
            type: SkillType.ACTIVE,
            name: '旋风斩',
            description: '快速旋转武器，对周围敌人造成伤害',
            iconPath: 'textures/ui/skills/whirlwind_icon',
            effectPath: 'effects/skills/whirlwind',
            cooldown: 8.0,
            cost: 20,
            level: 1,
            maxLevel: 5,
            levelData: [
                { damage: 15, radius: 3.0, duration: 2.0 },
                { damage: 20, radius: 3.5, duration: 2.0 },
                { damage: 25, radius: 4.0, duration: 2.0 },
                { damage: 30, radius: 4.5, duration: 2.5 },
                { damage: 40, radius: 5.0, duration: 3.0 }
            ]
        });
        
        // 被动技能 - 生命偷取
        this._skillConfigs.set('lifesteal', {
            id: 'lifesteal',
            type: SkillType.PASSIVE,
            name: '生命偷取',
            description: '攻击敌人时有几率回复生命值',
            iconPath: 'textures/ui/skills/lifesteal_icon',
            effectPath: 'effects/skills/lifesteal',
            cooldown: 0,
            level: 1,
            maxLevel: 3,
            levelData: [
                { chance: 0.1, percent: 0.05 },
                { chance: 0.15, percent: 0.08 },
                { chance: 0.2, percent: 0.12 }
            ]
        });
        
        // 终极技能 - 元素风暴
        this._skillConfigs.set('elemental_storm', {
            id: 'elemental_storm',
            type: SkillType.ULTIMATE,
            name: '元素风暴',
            description: '召唤强大的元素风暴，对大范围敌人造成持续伤害',
            iconPath: 'textures/ui/skills/elemental_storm_icon',
            effectPath: 'effects/skills/elemental_storm',
            cooldown: 30.0,
            cost: 50,
            level: 1,
            maxLevel: 3,
            levelData: [
                { damage: 8, radius: 8.0, duration: 5.0, tickRate: 0.5 },
                { damage: 12, radius: 10.0, duration: 6.0, tickRate: 0.5 },
                { damage: 16, radius: 12.0, duration: 8.0, tickRate: 0.5 }
            ],
            unlockCondition: '达到角色等级10'
        });
    }
    
    /**
     * 初始化永久升级项
     */
    private _initPermanentUpgrades(): void {
        // 最大生命值提升
        this._permanentUpgrades.set('max_health', {
            id: 'max_health',
            name: '生命强化',
            description: '永久提升最大生命值',
            iconPath: 'textures/ui/upgrades/max_health_icon',
            level: 0,
            maxLevel: 10,
            cost: 50,
            effect: { statName: 'maxHealth', valuePerLevel: 10 }
        });
        
        // 攻击力提升
        this._permanentUpgrades.set('attack_power', {
            id: 'attack_power',
            name: '力量强化',
            description: '永久提升攻击力',
            iconPath: 'textures/ui/upgrades/attack_power_icon',
            level: 0,
            maxLevel: 10,
            cost: 60,
            effect: { statName: 'attack', valuePerLevel: 2 }
        });
        
        // 移动速度提升
        this._permanentUpgrades.set('move_speed', {
            id: 'move_speed',
            name: '敏捷强化',
            description: '永久提升移动速度',
            iconPath: 'textures/ui/upgrades/move_speed_icon',
            level: 0,
            maxLevel: 5,
            cost: 70,
            effect: { statName: 'moveSpeed', valuePerLevel: 0.05 }
        });
        
        // 经验获取提升
        this._permanentUpgrades.set('exp_gain', {
            id: 'exp_gain',
            name: '经验强化',
            description: '永久提升获得的经验值',
            iconPath: 'textures/ui/upgrades/exp_gain_icon',
            level: 0,
            maxLevel: 5,
            cost: 80,
            effect: { statName: 'expMultiplier', valuePerLevel: 0.1 }
        });
        
        // 起始金币提升
        this._permanentUpgrades.set('starting_gold', {
            id: 'starting_gold',
            name: '财富强化',
            description: '每次运行开始时获得更多金币',
            iconPath: 'textures/ui/upgrades/starting_gold_icon',
            level: 0,
            maxLevel: 5,
            cost: 65,
            effect: { statName: 'startingGold', valuePerLevel: 50 }
        });
    }
    
    /**
     * 加载永久升级数据
     */
    private _loadPermanentUpgradeData(): void {
        // 从存档中加载永久升级数据
        const permanentData = saveManager.getPermanentUpgradeData();
        if (permanentData) {
            this._soulShards = permanentData.soulShards || 0;
            this._purchasedPermanentUpgrades = new Map(Object.entries(permanentData.upgrades || {}));
            
            // 更新永久升级项等级
            for (const [id, level] of this._purchasedPermanentUpgrades.entries()) {
                const upgrade = this._permanentUpgrades.get(id);
                if (upgrade) {
                    upgrade.level = level;
                }
            }
            
            logger.info(LogCategory.ROGUELIKE, `加载永久升级数据: ${this._soulShards} 灵魂碎片, ${this._purchasedPermanentUpgrades.size} 个升级项`);
        }
    }
    
    /**
     * 保存永久升级数据
     */
    private _savePermanentUpgradeData(): void {
        // 构建永久升级数据对象
        const permanentData = {
            soulShards: this._soulShards,
            upgrades: Object.fromEntries(this._purchasedPermanentUpgrades)
        };
        
        // 保存到存档
        saveManager.savePermanentUpgradeData(permanentData);
        logger.info(LogCategory.ROGUELIKE, '永久升级数据已保存');
    }
    
    /**
     * 游戏状态变化事件处理
     * @param newState 新状态
     * @param oldState 旧状态
     */
    private _onGameStateChanged(newState: string, oldState: string): void {
        // 根据游戏状态调整肉鸽系统行为
        logger.debug(LogCategory.ROGUELIKE, `游戏状态变化: ${oldState} -> ${newState}`);
    }
    
    /**
     * 日夜切换事件处理
     * @param isNight 是否为夜晚
     */
    private _onDayNightChanged(isNight: boolean): void {
        // 根据日夜状态调整肉鸽系统行为
        logger.debug(LogCategory.ROGUELIKE, `日夜切换: ${isNight ? '夜晚' : '白天'}`);
        
        // 在日夜切换时调整肉鸽系统状态
        this._roguelikeEnabled = isNight;
        
        if (isNight) {
            // 夜晚模式：启用肉鸽系统
            this._startRoguelikeMode();
        } else {
            // 白天模式：禁用肉鸽系统
            this._stopRoguelikeMode();
        }
        
        // 通知UI更新
        eventBus.emit(EventType.ROGUELIKE_SYSTEM_STATE_CHANGED, this._roguelikeEnabled);
    }
    
    /**
     * 敌人死亡事件处理
     * @param character 死亡的角色
     */
    private _onEnemyDied(character: BaseCharacter): void {
        // 只处理敌人死亡
        if (!character || character.camp !== CharacterCamp.ENEMY) {
            return;
        }
        
        // 只在肉鸽模式下处理
        if (!this._roguelikeEnabled || !this._isRunning) {
            return;
        }
        
        // 获取敌人提供的经验值和灵魂碎片
        const expGain = character.expValue || 10;
        const shardGain = character.shardValue || 0;
        
        // 应用经验值倍率（来自永久升级）
        const expMultiplier = this._getPermanentUpgradeEffect('exp_gain', 'expMultiplier', 1.0);
        const finalExpGain = Math.round(expGain * expMultiplier);
        
        // 增加经验值
        this._addExperience(finalExpGain);
        
        // 增加灵魂碎片（只有特殊敌人才会掉落）
        if (shardGain > 0) {
            this._addSoulShards(shardGain);
        }
        
        logger.debug(LogCategory.ROGUELIKE, `敌人死亡: 获得 ${finalExpGain} 经验值, ${shardGain} 灵魂碎片`);
    }
    
    /**
     * 玩家受伤事件处理
     * @param damage 伤害值
     * @param damageType 伤害类型
     * @param attacker 攻击者
     */
    private _onPlayerDamaged(damage: number, damageType: string, attacker: BaseCharacter): void {
        // 只在肉鸽模式下处理
        if (!this._roguelikeEnabled || !this._isRunning) {
            return;
        }
        
        // 可以在这里处理玩家受伤后的特殊效果
        // 例如触发某些被动技能或装备效果
    }
    
    /**
     * 玩家使用技能事件处理
     * @param skillId 技能ID
     */
    private _onPlayerUseSkill(skillId: string): void {
        // 只在肉鸽模式下处理
        if (!this._roguelikeEnabled || !this._isRunning) {
            return;
        }
        
        // 检查技能是否存在且已装备
        if (!this._equippedSkills.has(skillId)) {
            logger.warn(LogCategory.ROGUELIKE, `尝试使用未装备的技能: ${skillId}`);
            return;
        }
        
        const skill = this._equippedSkills.get(skillId);
        
        // 检查技能冷却
        const currentTime = Date.now() / 1000;
        const cooldownEndTime = this._skillCooldowns.get(skillId) || 0;
        
        if (currentTime < cooldownEndTime) {
            const remainingCooldown = Math.ceil(cooldownEndTime - currentTime);
            logger.warn(LogCategory.ROGUELIKE, `技能冷却中: ${skill.name}, 剩余 ${remainingCooldown} 秒`);
            return;
        }
        
        // 使用技能
        this._useSkill(skill);
    }
    
    /**
     * 使用技能
     * @param skill 技能信息
     */
    private _useSkill(skill: ISkillInfo): void {
        logger.info(LogCategory.ROGUELIKE, `使用技能: ${skill.name}`);
        
        // 获取技能数据
        const skillData = skill.levelData[skill.level - 1];
        
        // 设置技能冷却
        const currentTime = Date.now() / 1000;
        this._skillCooldowns.set(skill.id, currentTime + skill.cooldown);
        
        // 通知UI更新技能冷却
        eventBus.emit(EventType.SKILL_COOLDOWN_STARTED, {
            skillId: skill.id,
            cooldownEndTime: currentTime + skill.cooldown
        });
        
        // 根据技能类型执行不同的效果
        switch (skill.id) {
            case 'whirlwind':
                // 旋风斩技能效果
                this._executeWhirlwindSkill(skillData);
                break;
                
            case 'elemental_storm':
                // 元素风暴技能效果
                this._executeElementalStormSkill(skillData);
                break;
                
            default:
                logger.warn(LogCategory.ROGUELIKE, `未实现的技能效果: ${skill.id}`);
                break;
        }
    }
    
    /**
     * 执行旋风斩技能
     * @param skillData 技能数据
     */
    private _executeWhirlwindSkill(skillData: any): void {
        // 获取玩家位置
        const player = gameState.getPlayer();
        if (!player) {
            return;
        }
        
        const playerPos = player.getPosition();
        
        // 获取范围内的敌人
        const enemies = combatSystem.getEnemiesInRange(player, skillData.radius);
        
        // 对范围内的敌人造成伤害
        for (const enemy of enemies) {
            const damage = skillData.damage;
            combatSystem.applyDamage(player, enemy, damage, combatSystem.DamageType.PHYSICAL);
        }
        
        // 播放技能效果
        // 这里应该加载并播放技能特效
        
        logger.debug(LogCategory.ROGUELIKE, `旋风斩技能效果: 对 ${enemies.length} 个敌人造成伤害`);
    }
    
    /**
     * 执行元素风暴技能
     * @param skillData 技能数据
     */
    private _executeElementalStormSkill(skillData: any): void {
        // 获取玩家位置
        const player = gameState.getPlayer();
        if (!player) {
            return;
        }
        
        const playerPos = player.getPosition();
        
        // 创建持续伤害区域
        // 这里应该创建一个持续伤害区域，每隔一段时间对范围内的敌人造成伤害
        
        // 模拟持续伤害效果
        let tickCount = 0;
        const maxTicks = Math.floor(skillData.duration / skillData.tickRate);
        
        const tickDamage = () => {
            if (tickCount >= maxTicks) {
                return;
            }
            
            // 获取范围内的敌人
            const enemies = combatSystem.getEnemiesInRange(player, skillData.radius);
            
            // 对范围内的敌人造成伤害
            for (const enemy of enemies) {
                const damage = skillData.damage;
                combatSystem.applyDamage(player, enemy, damage, combatSystem.DamageType.MAGICAL);
            }
            
            tickCount++;
            
            // 继续下一次伤害
            setTimeout(tickDamage, skillData.tickRate * 1000);
        };
        
        // 开始第一次伤害
        tickDamage();
        
        logger.debug(LogCategory.ROGUELIKE, `元素风暴技能效果: 创建持续伤害区域, 持续 ${skillData.duration} 秒`);
    }
    
    /**
     * 启动肉鸽模式
     */
    private _startRoguelikeMode(): void {
        if (this._isRunning) {
            return;
        }
        
        logger.info(LogCategory.ROGUELIKE, '启动肉鸽模式');
        
        // 重置当前运行状态
        this._resetRunState();
        
        // 应用永久升级效果
        this._applyPermanentUpgrades();
        
        // 设置初始武器
        this._equipInitialWeapon();
        
        // 设置运行状态为启动
        this._isRunning = true;
        
        // 通知UI更新
        eventBus.emit(EventType.ROGUELIKE_RUN_STARTED);
    }
    
    /**
     * 停止肉鸽模式
     */
    private _stopRoguelikeMode(): void {
        if (!this._isRunning) {
            return;
        }
        
        logger.info(LogCategory.ROGUELIKE, '停止肉鸽模式');
        
        // 保存永久升级数据
        this._savePermanentUpgradeData();
        
        // 设置运行状态为停止
        this._isRunning = false;
        
        // 通知UI更新
        eventBus.emit(EventType.ROGUELIKE_RUN_ENDED);
    }
    
    /**
     * 重置当前运行状态
     */
    private _resetRunState(): void {
        // 重置经验值和等级
        this._experience = 0;
        this._level = 1;
        this._experienceToNextLevel = 100;
        this._upgradePoints = 0;
        
        // 重置装备和技能
        this._equippedWeapon = null;
        this._equippedSkills.clear();
        this._skillCooldowns.clear();
        
        logger.debug(LogCategory.ROGUELIKE, '重置肉鸽运行状态');
    }
    
    /**
     * 应用永久升级效果
     */
    private _applyPermanentUpgrades(): void {
        // 获取玩家角色
        const player = gameState.getPlayer();
        if (!player) {
            return;
        }
        
        // 应用各种永久升级效果
        for (const [id, upgrade] of this._permanentUpgrades.entries()) {
            const level = this._purchasedPermanentUpgrades.get(id) || 0;
            if (level <= 0) {
                continue;
            }
            
            const effect = upgrade.effect;
            const value = effect.valuePerLevel * level;
            
            // 根据升级类型应用不同的效果
            switch (effect.statName) {
                case 'maxHealth':
                    player.attributes.maxHealth += value;
                    player.heal(value); // 同时恢复相应的生命值
                    break;
                    
                case 'attack':
                    player.attributes.attack += value;
                    break;
                    
                case 'moveSpeed':
                    player.attributes.moveSpeed += value;
                    break;
                    
                case 'startingGold':
                    // 设置初始金币
                    gameState.addGold(value);
                    break;
                    
                default:
                    // 其他效果不直接应用到玩家属性
                    break;
            }
        }
        
        logger.debug(LogCategory.ROGUELIKE, '应用永久升级效果');
    }
    
    /**
     * 装备初始武器
     */
    private _equipInitialWeapon(): void {
        // 默认装备普通剑
        const initialWeapon = this._weaponConfigs.get('sword_common');
        if (initialWeapon) {
            this._equipWeapon(initialWeapon.id);
        }
    }
    
    /**
     * 添加经验值
     * @param amount 经验值数量
     */
    private _addExperience(amount: number): void {
        if (amount <= 0) {
            return;
        }
        
        this._experience += amount;
        
        // 检查是否升级
        while (this._experience >= this._experienceToNextLevel) {
            this._levelUp();
        }
        
        // 通知UI更新
        eventBus.emit(EventType.PLAYER_EXPERIENCE_CHANGED, {
            experience: this._experience,
            experienceToNextLevel: this._experienceToNextLevel,
            level: this._level
        });
    }
    
    /**
     * 角色升级
     */
    private _levelUp(): void {
        // 增加等级
        this._level++;
        
        // 减少经验值
        this._experience -= this._experienceToNextLevel;
        
        // 计算下一级所需经验值
        this._experienceToNextLevel = Math.floor(this._experienceToNextLevel * 1.2 + 50);
        
        // 增加升级点数
        this._upgradePoints++;
        
        // 通知UI更新
        eventBus.emit(EventType.PLAYER_LEVEL_UP, {
            level: this._level,
            upgradePoints: this._upgradePoints
        });
        
        // 生成升级选项
        const upgradeOptions = this._generateUpgradeOptions();
        
        // 显示升级选项UI
        eventBus.emit(EventType.SHOW_UPGRADE_OPTIONS, upgradeOptions);
        
        logger.info(LogCategory.ROGUELIKE, `角色升级: ${this._level}级, 获得1点升级点数`);
    }
    
    /**
     * 生成升级选项
     * @returns 升级选项列表
     */
    private _generateUpgradeOptions(): IUpgradeOption[] {
        const options: IUpgradeOption[] = [];
        
        // 生成3个随机升级选项
        // 这里简化处理，实际应该根据当前角色状态和已有技能/武器生成合适的选项
        
        // 添加武器升级选项
        if (this._equippedWeapon) {
            options.push({
                type: UpgradeOptionType.WEAPON,
                id: 'weapon_damage',
                name: '武器强化',
                description: '提升当前武器的伤害',
                iconPath: 'textures/ui/upgrades/weapon_damage_icon',
                data: { damageIncrease: 5 }
            });
        }
        
        // 添加技能升级选项
        if (this._equippedSkills.size > 0) {
            const skillIds = Array.from(this._equippedSkills.keys());
            const randomSkillId = skillIds[Math.floor(Math.random() * skillIds.length)];
            const skill = this._equippedSkills.get(randomSkillId);
            
            if (skill && skill.level < skill.maxLevel) {
                options.push({
                    type: UpgradeOptionType.SKILL,
                    id: skill.id,
                    name: `${skill.name} 升级`,
                    description: `提升 ${skill.name} 技能等级`,
                    iconPath: skill.iconPath,
                    data: { skillId: skill.id }
                });
            }
        }
        
        // 添加属性升级选项
        options.push({
            type: UpgradeOptionType.ATTRIBUTE,
            id: 'max_health',
            name: '生命提升',
            description: '提升最大生命值',
            iconPath: 'textures/ui/upgrades/max_health_icon',
            data: { statName: 'maxHealth', value: 20 }
        });
        
        options.push({
            type: UpgradeOptionType.ATTRIBUTE,
            id: 'attack',
            name: '攻击提升',
            description: '提升攻击力',
            iconPath: 'textures/ui/upgrades/attack_icon',
            data: { statName: 'attack', value: 5 }
        });
        
        // 如果选项不足3个，添加更多选项
        if (options.length < 3) {
            options.push({
                type: UpgradeOptionType.ATTRIBUTE,
                id: 'move_speed',
                name: '速度提升',
                description: '提升移动速度',
                iconPath: 'textures/ui/upgrades/move_speed_icon',
                data: { statName: 'moveSpeed', value: 0.1 }
            });
        }
        
        // 随机选择3个选项
        const shuffled = options.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3);
    }
    
    /**
     * 应用升级选项
     * @param option 升级选项
     */
    public applyUpgradeOption(option: IUpgradeOption): void {
        if (!option || this._upgradePoints <= 0) {
            return;
        }
        
        logger.info(LogCategory.ROGUELIKE, `应用升级选项: ${option.name}`);
        
        // 获取玩家角色
        const player = gameState.getPlayer();
        if (!player) {
            return;
        }
        
        // 根据选项类型应用不同的效果
        switch (option.type) {
            case UpgradeOptionType.WEAPON:
                // 武器升级
                if (this._equippedWeapon) {
                    this._equippedWeapon.attributes.baseDamage += option.data.damageIncrease;
                    eventBus.emit(EventType.WEAPON_UPGRADED, this._equippedWeapon);
                }
                break;
                
            case UpgradeOptionType.SKILL:
                // 技能升级
                const skillId = option.data.skillId;
                const skill = this._equippedSkills.get(skillId);
                if (skill && skill.level < skill.maxLevel) {
                    skill.level++;
                    eventBus.emit(EventType.SKILL_UPGRADED, skill);
                }
                break;
                
            case UpgradeOptionType.ATTRIBUTE:
                // 属性升级
                const statName = option.data.statName;
                const value = option.data.value;
                
                if (statName === 'maxHealth') {
                    player.attributes.maxHealth += value;
                    player.heal(value); // 同时恢复相应的生命值
                } else if (statName === 'attack') {
                    player.attributes.attack += value;
                } else if (statName === 'moveSpeed') {
                    player.attributes.moveSpeed += value;
                }
                
                eventBus.emit(EventType.PLAYER_ATTRIBUTE_CHANGED, {
                    statName,
                    value: player.attributes[statName]
                });
                break;
                
            case UpgradeOptionType.ABILITY:
                // 特殊能力
                // 根据特殊能力类型应用不同的效果
                break;
        }
        
        // 减少升级点数
        this._upgradePoints--;
        
        // 通知UI更新
        eventBus.emit(EventType.UPGRADE_POINTS_CHANGED, this._upgradePoints);
    }
    
    /**
     * 添加灵魂碎片
     * @param amount 灵魂碎片数量
     */
    private _addSoulShards(amount: number): void {
        if (amount <= 0) {
            return;
        }
        
        this._soulShards += amount;
        
        // 通知UI更新
        eventBus.emit(EventType.SOUL_SHARDS_CHANGED, this._soulShards);
        
        // 保存永久升级数据
        this._savePermanentUpgradeData();
        
        logger.debug(LogCategory.ROGUELIKE, `获得灵魂碎片: ${amount}, 总计: ${this._soulShards}`);
    }
    
    /**
     * 购买永久升级
     * @param upgradeId 升级ID
     * @returns 是否购买成功
     */
    public purchasePermanentUpgrade(upgradeId: string): boolean {
        // 检查升级是否存在
        const upgrade = this._permanentUpgrades.get(upgradeId);
        if (!upgrade) {
            logger.warn(LogCategory.ROGUELIKE, `购买永久升级失败: 未找到升级 ${upgradeId}`);
            return false;
        }
        
        // 获取当前等级
        const currentLevel = this._purchasedPermanentUpgrades.get(upgradeId) || 0;
        
        // 检查是否已达到最大等级
        if (currentLevel >= upgrade.maxLevel) {
            logger.warn(LogCategory.ROGUELIKE, `购买永久升级失败: 已达到最大等级 ${upgradeId}`);
            return false;
        }
        
        // 计算升级成本
        const cost = upgrade.cost * (currentLevel + 1);
        
        // 检查灵魂碎片是否足够
        if (this._soulShards < cost) {
            logger.warn(LogCategory.ROGUELIKE, `购买永久升级失败: 灵魂碎片不足 ${this._soulShards}/${cost}`);
            return false;
        }
        
        // 扣除灵魂碎片
        this._soulShards -= cost;
        
        // 增加升级等级
        const newLevel = currentLevel + 1;
        this._purchasedPermanentUpgrades.set(upgradeId, newLevel);
        upgrade.level = newLevel;
        
        // 保存永久升级数据
        this._savePermanentUpgradeData();
        
        // 通知UI更新
        eventBus.emit(EventType.PERMANENT_UPGRADE_PURCHASED, {
            upgradeId,
            level: newLevel,
            soulShards: this._soulShards
        });
        
        logger.info(LogCategory.ROGUELIKE, `购买永久升级成功: ${upgrade.name} 等级 ${newLevel}`);
        
        return true;
    }
    
    /**
     * 装备武器
     * @param weaponId 武器ID
     * @returns 是否装备成功
     */
    public equipWeapon(weaponId: string): boolean {
        return this._equipWeapon(weaponId);
    }
    
    /**
     * 内部装备武器方法
     * @param weaponId 武器ID
     * @returns 是否装备成功
     */
    private _equipWeapon(weaponId: string): boolean {
        // 检查武器是否存在
        const weapon = this._weaponConfigs.get(weaponId);
        if (!weapon) {
            logger.warn(LogCategory.ROGUELIKE, `装备武器失败: 未找到武器 ${weaponId}`);
            return false;
        }
        
        // 检查武器是否已解锁
        if (weapon.unlockCondition && !this._unlockedWeapons.has(weaponId)) {
            logger.warn(LogCategory.ROGUELIKE, `装备武器失败: 武器未解锁 ${weaponId}`);
            return false;
        }
        
        // 获取玩家角色
        const player = gameState.getPlayer();
        if (!player) {
            return false;
        }
        
        // 卸下当前武器
        if (this._equippedWeapon) {
            // 移除当前武器的属性加成
            // 这里简化处理，实际应该根据武器属性调整玩家属性
        }
        
        // 装备新武器
        this._equippedWeapon = weapon;
        
        // 应用新武器的属性加成
        // 这里简化处理，实际应该根据武器属性调整玩家属性
        
        // 通知UI更新
        eventBus.emit(EventType.WEAPON_EQUIPPED, weapon);
        
        logger.info(LogCategory.ROGUELIKE, `装备武器: ${weapon.name}`);
        
        return true;
    }
    
    /**
     * 装备技能
     * @param skillId 技能ID
     * @param slotIndex 技能槽索引
     * @returns 是否装备成功
     */
    public equipSkill(skillId: string, slotIndex: number): boolean {
        // 检查技能是否存在
        const skill = this._skillConfigs.get(skillId);
        if (!skill) {
            logger.warn(LogCategory.ROGUELIKE, `装备技能失败: 未找到技能 ${skillId}`);
            return false;
        }
        
        // 检查技能是否已解锁
        if (skill.unlockCondition && !this._unlockedSkills.has(skillId)) {
            logger.warn(LogCategory.ROGUELIKE, `装备技能失败: 技能未解锁 ${skillId}`);
            return false;
        }
        
        // 检查技能槽是否有效
        if (slotIndex < 0 || slotIndex > 3) {
            logger.warn(LogCategory.ROGUELIKE, `装备技能失败: 技能槽无效 ${slotIndex}`);
            return false;
        }
        
        // 检查是否已装备该技能
        if (this._equippedSkills.has(skillId)) {
            logger.warn(LogCategory.ROGUELIKE, `装备技能失败: 技能已装备 ${skillId}`);
            return false;
        }
        
        // 移除该槽位的现有技能
        for (const [id, equippedSkill] of this._equippedSkills.entries()) {
            if (equippedSkill.slotIndex === slotIndex) {
                this._equippedSkills.delete(id);
                break;
            }
        }
        
        // 装备新技能
        skill.slotIndex = slotIndex;
        this._equippedSkills.set(skillId, skill);
        
        // 重置技能冷却
        this._skillCooldowns.delete(skillId);
        
        // 通知UI更新
        eventBus.emit(EventType.SKILL_EQUIPPED, {
            skill,
            slotIndex
        });
        
        logger.info(LogCategory.ROGUELIKE, `装备技能: ${skill.name} 到槽位 ${slotIndex}`);
        
        return true;
    }
    
    /**
     * 解锁武器
     * @param weaponId 武器ID
     */
    public unlockWeapon(weaponId: string): void {
        if (this._weaponConfigs.has(weaponId) && !this._unlockedWeapons.has(weaponId)) {
            this._unlockedWeapons.add(weaponId);
            
            // 通知UI更新
            eventBus.emit(EventType.WEAPON_UNLOCKED, this._weaponConfigs.get(weaponId));
            
            logger.info(LogCategory.ROGUELIKE, `解锁武器: ${this._weaponConfigs.get(weaponId).name}`);
        }
    }
    
    /**
     * 解锁技能
     * @param skillId 技能ID
     */
    public unlockSkill(skillId: string): void {
        if (this._skillConfigs.has(skillId) && !this._unlockedSkills.has(skillId)) {
            this._unlockedSkills.add(skillId);
            
            // 通知UI更新
            eventBus.emit(EventType.SKILL_UNLOCKED, this._skillConfigs.get(skillId));
            
            logger.info(LogCategory.ROGUELIKE, `解锁技能: ${this._skillConfigs.get(skillId).name}`);
        }
    }
    
    /**
     * 获取永久升级效果值
     * @param upgradeId 升级ID
     * @param effectName 效果名称
     * @param defaultValue 默认值
     * @returns 效果值
     */
    private _getPermanentUpgradeEffect(upgradeId: string, effectName: string, defaultValue: number): number {
        const upgrade = this._permanentUpgrades.get(upgradeId);
        if (!upgrade) {
            return defaultValue;
        }
        
        const level = this._purchasedPermanentUpgrades.get(upgradeId) || 0;
        if (level <= 0) {
            return defaultValue;
        }
        
        const effect = upgrade.effect;
        if (effect.statName !== effectName) {
            return defaultValue;
        }
        
        return 1.0 + (effect.valuePerLevel * level);
    }
    
    /**
     * 获取当前装备的武器
     * @returns 当前装备的武器
     */
    public getEquippedWeapon(): IWeaponInfo {
        return this._equippedWeapon;
    }
    
    /**
     * 获取当前装备的技能
     * @returns 当前装备的技能列表
     */
    public getEquippedSkills(): ISkillInfo[] {
        return Array.from(this._equippedSkills.values());
    }
    
    /**
     * 获取技能冷却状态
     * @param skillId 技能ID
     * @returns 冷却结束时间（秒），如果不在冷却中则返回0
     */
    public getSkillCooldown(skillId: string): number {
        return this._skillCooldowns.get(skillId) || 0;
    }
    
    /**
     * 获取当前等级
     * @returns 当前等级
     */
    public getLevel(): number {
        return this._level;
    }
    
    /**
     * 获取当前经验值
     * @returns 当前经验值
     */
    public getExperience(): number {
        return this._experience;
    }
    
    /**
     * 获取升级所需经验值
     * @returns 升级所需经验值
     */
    public getExperienceToNextLevel(): number {
        return this._experienceToNextLevel;
    }
    
    /**
     * 获取可用升级点数
     * @returns 可用升级点数
     */
    public getUpgradePoints(): number {
        return this._upgradePoints;
    }
    
    /**
     * 获取灵魂碎片数量
     * @returns 灵魂碎片数量
     */
    public getSoulShards(): number {
        return this._soulShards;
    }
    
    /**
     * 获取永久升级项列表
     * @returns 永久升级项列表
     */
    public getPermanentUpgrades(): IPermanentUpgrade[] {
        return Array.from(this._permanentUpgrades.values());
    }
    
    /**
     * 获取已购买的永久升级等级
     * @param upgradeId 升级ID
     * @returns 升级等级
     */
    public getPermanentUpgradeLevel(upgradeId: string): number {
        return this._purchasedPermanentUpgrades.get(upgradeId) || 0;
    }
    
    /**
     * 是否启用肉鸽模式
     * @returns 是否启用肉鸽模式
     */
    public isRoguelikeEnabled(): boolean {
        return this._roguelikeEnabled;
    }
    
    /**
     * 是否正在运行肉鸽模式
     * @returns 是否正在运行肉鸽模式
     */
    public isRunning(): boolean {
        return this._isRunning;
    }
    
    /**
     * 清理肉鸽系统
     * 在场景切换或游戏重置时调用
     */
    public cleanup(): void {
        logger.info(LogCategory.ROGUELIKE, '清理肉鸽系统');
        
        // 保存永久升级数据
        this._savePermanentUpgradeData();
        
        // 重置运行状态
        this._isRunning = false;
        
        // 清空临时数据
        this._equippedWeapon = null;
        this._equippedSkills.clear();
        this._skillCooldowns.clear();
        this._experience = 0;
        this._level = 1;
        this._experienceToNextLevel = 100;
        this._upgradePoints = 0;
    }
}

// 导出单例实例
export const roguelikeSystem = RoguelikeSystem.getInstance();