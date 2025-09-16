import { _decorator } from 'cc';
import { logger, LogCategory } from '../Core/Logger';
import { EventBus, EventType } from '../Core/EventBus';
import { resourceManager } from '../Core/ResourceManager';
import { GameState } from '../Core/GameState';
import { BaseCharacter, CharacterFaction } from '../Character/BaseCharacter';

/**
 * 战斗系统
 * 负责管理战斗相关的逻辑，包括伤害计算、技能释放、状态效果等
 */
export class CombatSystem {
    private static _instance: CombatSystem = null;
    
    /** 伤害类型枚举 */
    public static DamageType = {
        /** 物理伤害 */
        PHYSICAL: 'physical',
        /** 魔法伤害 */
        MAGICAL: 'magical',
        /** 真实伤害 */
        TRUE: 'true'
    };
    
    /** 战斗单位列表 */
    private _combatUnits: Map<string, BaseCharacter> = new Map();
    /** 敌人单位列表 */
    private _enemies: BaseCharacter[] = [];
    /** 友方单位列表 */
    private _allies: BaseCharacter[] = [];
    /** 塔防单位列表 */
    private _towerUnits: BaseCharacter[] = [];
    
    /**
     * 获取单例实例
     */
    public static getInstance(): CombatSystem {
        if (!this._instance) {
            this._instance = new CombatSystem();
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
     * 初始化战斗系统
     */
    private _initialize(): void {
        logger.info(LogCategory.COMBAT, '战斗系统初始化');
        
        // 注册事件监听
        this._registerEvents();
    }
    
    /**
     * 注册事件监听
     */
    private _registerEvents(): void {
        // 角色创建事件
        EventBus.getInstance().on(EventType.CHARACTER_CREATED, this._onCharacterCreated.bind(this));
        // 角色死亡事件
        EventBus.getInstance().on(EventType.CHARACTER_DEATH, this._onCharacterDied.bind(this));
        // 游戏状态变化事件
        EventBus.getInstance().on(EventType.GAME_STATE_CHANGED, this._onGameStateChanged.bind(this));
        // 日夜切换事件
        EventBus.getInstance().on(EventType.DAY_NIGHT_CHANGED, this._onDayNightChanged.bind(this));
    }
    
    /**
     * 角色创建事件处理
     * @param character 角色实例
     */
    private _onCharacterCreated(character: BaseCharacter): void {
        if (!character) {
            logger.warn(LogCategory.COMBAT, '尝试添加无效角色到战斗系统');
            return;
        }
        
        // 使用角色的uuid或node.uuid作为唯一标识符
        const characterId = character.uuid || (character.node && character.node.uuid);
        
        if (!characterId) {
            logger.warn(LogCategory.COMBAT, '角色缺少有效的唯一标识符');
            return;
        }
        
        // 添加到战斗单位列表
        this._combatUnits.set(characterId, character);
        
        // 根据阵营分类
        if (character.faction === CharacterFaction.ENEMY) {
            this._enemies.push(character);
        } else if (character.faction === CharacterFaction.FRIENDLY) {
            this._allies.push(character);
        }
        
        // 如果是塔防单位，添加到塔防单位列表
        if (character.faction === CharacterFaction.TOWER) {
            this._towerUnits.push(character);
        }
        
        logger.debug(LogCategory.COMBAT, `角色添加到战斗系统: ${characterId}, 阵营: ${character.faction}`);
    }
    
    /**
     * 角色死亡事件处理
     * @param character 角色实例
     */
    private _onCharacterDied(character: BaseCharacter): void {
        if (!character) {
            return;
        }
        
        // 使用角色的uuid或node.uuid作为唯一标识符
        const characterId = character.uuid || (character.node && character.node.uuid);
        
        if (!characterId) {
            return;
        }
        
        // 从战斗单位列表中移除
        this._combatUnits.delete(characterId);
        
        // 从对应阵营列表中移除
        if (character.faction === CharacterFaction.ENEMY) {
            const index = this._enemies.indexOf(character);
            if (index >= 0) {
                this._enemies.splice(index, 1);
            }
        } else if (character.faction === CharacterFaction.FRIENDLY) {
            const index = this._allies.indexOf(character);
            if (index >= 0) {
                this._allies.splice(index, 1);
            }
        }
        
        // 如果是塔防单位，从塔防单位列表中移除
        if (character.faction === CharacterFaction.TOWER) {
            const index = this._towerUnits.indexOf(character);
            if (index >= 0) {
                this._towerUnits.splice(index, 1);
            }
        }
        
        logger.debug(LogCategory.COMBAT, `角色从战斗系统移除: ${characterId}`);
    }
    
    /**
     * 游戏状态变化事件处理
     * @param newState 新状态
     * @param oldState 旧状态
     */
    private _onGameStateChanged(newState: string, oldState: string): void {
        // 根据游戏状态调整战斗系统行为
        logger.debug(LogCategory.COMBAT, `游戏状态变化: ${oldState} -> ${newState}`);
    }
    
    /**
     * 日夜切换事件处理
     * @param isNight 是否为夜晚
     */
    private _onDayNightChanged(isNight: boolean): void {
        // 根据日夜状态调整战斗系统行为
        logger.debug(LogCategory.COMBAT, `日夜切换: ${isNight ? '夜晚' : '白天'}`);
        
        // 在日夜切换时可能需要调整敌人生成、塔防单位行为等
        if (isNight) {
            // 夜晚模式：启用肉鸽战斗逻辑
            this._enableRoguelikeCombat();
        } else {
            // 白天模式：启用塔防战斗逻辑
            this._enableTowerDefenseCombat();
        }
    }
    
    /**
     * 启用肉鸽战斗逻辑
     */
    private _enableRoguelikeCombat(): void {
        logger.info(LogCategory.COMBAT, '启用肉鸽战斗逻辑');
        // 禁用塔防单位的自动攻击
        this._towerUnits.forEach(tower => {
            tower.setAutoAttack(false);
        });
    }
    
    /**
     * 启用塔防战斗逻辑
     */
    private _enableTowerDefenseCombat(): void {
        logger.info(LogCategory.COMBAT, '启用塔防战斗逻辑');
        // 启用塔防单位的自动攻击
        this._towerUnits.forEach(tower => {
            tower.setAutoAttack(true);
        });
    }
    
    /**
     * 计算伤害
     * @param attacker 攻击者
     * @param target 目标
     * @param baseDamage 基础伤害
     * @param damageType 伤害类型
     * @returns 最终伤害值
     */
    public calculateDamage(attacker: BaseCharacter, target: BaseCharacter, baseDamage: number, damageType: string): number {
        if (!attacker || !target) {
            return 0;
        }
        
        let finalDamage = baseDamage;
        
        // 根据伤害类型应用不同的计算公式
        switch (damageType) {
            case CombatSystem.DamageType.PHYSICAL:
                // 物理伤害计算：考虑攻击力和护甲
                finalDamage = baseDamage * (attacker.attributes.attackPower / 100) * (1 - target.attributes.defense / (100 + target.attributes.defense));
                break;
                
            //case CombatSystem.DamageType.MAGICAL:
                // 魔法伤害计算：考虑魔法强度和魔法抗性
                //finalDamage = baseDamage * (attacker.attributes.magicalPower / 100) * (1 - target.attributes.magicResistance / (100 + target.attributes.magicResistance));
                //break;
                
            case CombatSystem.DamageType.TRUE:
                // 真实伤害：不受防御和抗性影响
                finalDamage = baseDamage;
                break;
                
            default:
                finalDamage = baseDamage;
                break;
        }
        
        // 确保伤害不小于1
        finalDamage = Math.max(1, Math.round(finalDamage));
        
        return finalDamage;
    }
    
    /**
     * 应用伤害
     * @param attacker 攻击者
     * @param target 目标
     * @param damage 伤害值
     * @param damageType 伤害类型
     * @returns 实际造成的伤害
     */
    public applyDamage(attacker: BaseCharacter, target: BaseCharacter, damage: number, damageType: string): number {
        if (!target) {
            return 0;
        }
        
        // 计算最终伤害
        const finalDamage = this.calculateDamage(attacker, target, damage, damageType);
        
        // 应用伤害到目标
        target.takeDamage(finalDamage);
        
        // 触发伤害事件
        EventBus.getInstance().emit('damage_dealt', {
            attacker,
            target,
            damage: finalDamage,
            damageType
        });
        
        return finalDamage;
    }
    
    /**
     * 检查目标是否在攻击范围内
     * @param attacker 攻击者
     * @param target 目标
     * @returns 是否在攻击范围内
     */
    public isTargetInRange(attacker: BaseCharacter, target: BaseCharacter): boolean {
        if (!attacker || !target) {
            return false;
        }
        
        // 获取攻击者位置和攻击范围
        const attackerPos = attacker.getPosition();
        const targetPos = target.getPosition();
        const attackRange = attacker.attributes.attackRange;
        
        // 计算距离
        const distance = Math.sqrt(
            Math.pow(targetPos.x - attackerPos.x, 2) +
            Math.pow(targetPos.y - attackerPos.y, 2)
        );
        
        // 检查是否在范围内
        return distance <= attackRange;
    }
    
    /**
     * 获取最近的敌人
     * @param character 角色
     * @param maxRange 最大搜索范围，如果为0则不限制范围
     * @returns 最近的敌人，如果没有则返回null
     */
    public getNearestEnemy(character: BaseCharacter, maxRange: number = 0): BaseCharacter {
        if (!character) {
            return null;
        }
        
        // 确定目标列表（敌对阵营）
        const targetList = character.faction === CharacterFaction.ENEMY ? this._allies : this._enemies;
        if (targetList.length === 0) {
            return null;
        }
        
        const characterPos = character.getPosition();
        let nearestEnemy: BaseCharacter = null;
        let minDistance = Number.MAX_VALUE;
        
        // 遍历所有可能的目标
        for (const target of targetList) {
            if (!target.isAlive()) {
                continue;
            }
            
            const targetPos = target.getPosition();
            const distance = Math.sqrt(
                Math.pow(targetPos.x - characterPos.x, 2) +
                Math.pow(targetPos.y - characterPos.y, 2)
            );
            
            // 如果指定了最大范围且超出范围，则跳过
            if (maxRange > 0 && distance > maxRange) {
                continue;
            }
            
            // 更新最近的敌人
            if (distance < minDistance) {
                minDistance = distance;
                nearestEnemy = target;
            }
        }
        
        return nearestEnemy;
    }
    
    /**
     * 获取范围内的敌人
     * @param character 角色
     * @param range 搜索范围
     * @returns 范围内的敌人列表
     */
    public getEnemiesInRange(character: BaseCharacter, range: number): BaseCharacter[] {
        if (!character || range <= 0) {
            return [];
        }
        
        // 确定目标列表（敌对阵营）
        const targetList = character.faction === CharacterFaction.ENEMY ? this._allies : this._enemies;
        if (targetList.length === 0) {
            return [];
        }
        
        const characterPos = character.getPosition();
        const enemiesInRange: BaseCharacter[] = [];
        
        // 遍历所有可能的目标
        for (const target of targetList) {
            if (!target.isAlive()) {
                continue;
            }
            
            const targetPos = target.getPosition();
            const distance = Math.sqrt(
                Math.pow(targetPos.x - characterPos.x, 2) +
                Math.pow(targetPos.y - characterPos.y, 2)
            );
            
            // 如果在范围内，则添加到列表
            if (distance <= range) {
                enemiesInRange.push(target);
            }
        }
        
        return enemiesInRange;
    }
    
    /**
     * 清理战斗系统
     * 在场景切换或游戏重置时调用
     */
    public cleanup(): void {
        logger.info(LogCategory.COMBAT, '清理战斗系统');
        
        // 清空单位列表
        this._combatUnits.clear();
        this._enemies = [];
        this._allies = [];
        this._towerUnits = [];
    }
}

// 导出单例实例
export const combatSystem = CombatSystem.getInstance();