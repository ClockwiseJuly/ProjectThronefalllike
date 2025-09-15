import { _decorator, Component, Node, Vec3, instantiate, Prefab, Animation } from 'cc';
import { GameState, GameStateType } from '../../Core/GameState';
const { ccclass, property } = _decorator;

/**
 * 敌人类型枚举
 */
export enum EnemyType {
    BASIC = 0,          // 基础敌人
    FAST = 1,           // 快速敌人
    TANK = 2,           // 坦克敌人
    FLYING = 3,         // 飞行敌人
    RANGED = 4,         // 远程敌人
    BOSS = 5,           // Boss敌人
    ELITE = 6,          // 精英敌人
}

/**
 * 敌人状态枚举
 */
export enum EnemyState {
    IDLE = 0,           // 待机
    MOVING = 1,         // 移动
    ATTACKING = 2,      // 攻击
    DYING = 3,          // 死亡中
    DEAD = 4,           // 已死亡
    STUNNED = 5,        // 眩晕
    FROZEN = 6,         // 冰冻
    BURNING = 7,        // 燃烧
}

/**
 * 敌人属性接口
 */
export interface IEnemyStats {
    health: number;         // 生命值
    maxHealth: number;      // 最大生命值
    attack: number;         // 攻击力
    defense: number;        // 防御力
    speed: number;          // 移动速度
    attackSpeed: number;    // 攻击速度
    range: number;          // 攻击范围
    experience: number;     // 经验值
    gold: number;          // 金币奖励
    score: number;         // 分数奖励
}

/**
 * 敌人数据接口
 */
export interface IEnemyData {
    id: string;
    enemyType: EnemyType;
    state: EnemyState;
    stats: IEnemyStats;
    position: Vec3;
    targetPosition: Vec3;
    currentNode: number;    // 当前路径节点
    isActive: boolean;
    lastAttackTime: number;
    targetId?: string;      // 攻击目标ID
    effects: Map<string, any>; // 状态效果
}

/**
 * 路径点接口
 */
export interface IPathPoint {
    position: Vec3;
    waitTime: number;       // 在此点等待时间
    isCheckpoint: boolean;  // 是否为检查点
}

/**
 * 敌人系统
 * 负责敌人的生成、移动、攻击、死亡等逻辑
 */
@ccclass('EnemySystem')
export class EnemySystem extends Component {
    private static _instance: EnemySystem = null;
    
    @property(Node)
    public enemyContainer: Node = null; // 敌人容器节点
    
    @property([Prefab])
    public enemyPrefabs: Prefab[] = []; // 敌人预制体数组
    
    @property(Node)
    public pathNode: Node = null; // 路径节点
    
    // 敌人管理
    private _enemies: Map<string, IEnemyData> = new Map();
    private _enemyStats: Map<EnemyType, IEnemyStats> = new Map();
    private _pathPoints: IPathPoint[] = [];
    
    // 生成参数
    private _spawnPosition: Vec3 = new Vec3(-10, 0, 0);
    private _spawnInterval: number = 2.0;
    private _lastSpawnTime: number = 0;
    private _isSpawning: boolean = false;
    
    // 游戏状态
    private _isActive: boolean = false;
    private _totalEnemiesSpawned: number = 0;
    private _totalEnemiesKilled: number = 0;
    
    /**
     * 获取单例实例
     */
    public static getInstance(): EnemySystem {
        return EnemySystem._instance;
    }
    
    onLoad() {
        if (EnemySystem._instance === null) {
            EnemySystem._instance = this;
            this.initializeEnemySystem();
        } else {
            this.node.destroy();
        }
    }
    
    /**
     * 初始化敌人系统
     */
    private initializeEnemySystem(): void {
        console.log("敌人系统初始化");
        
        // 初始化敌人属性数据
        this.initializeEnemyStats();
        
        // 初始化路径点
        this.initializePathPoints();
        
        // 注册游戏状态监听
        const gameState = GameState.getInstance();
        gameState.onStateEnter(GameStateType.TOWER_DEFENSE, () => {
            this.startEnemySystem();
        });
        
        gameState.onStateExit(GameStateType.TOWER_DEFENSE, () => {
            this.stopEnemySystem();
        });
    }
    
    /**
     * 初始化敌人属性数据
     */
    private initializeEnemyStats(): void {
        // 基础敌人
        this._enemyStats.set(EnemyType.BASIC, {
            health: 50,
            maxHealth: 50,
            attack: 10,
            defense: 2,
            speed: 1.0,
            attackSpeed: 1.0,
            range: 1.0,
            experience: 10,
            gold: 5,
            score: 10
        });
        
        // 快速敌人
        this._enemyStats.set(EnemyType.FAST, {
            health: 30,
            maxHealth: 30,
            attack: 8,
            defense: 1,
            speed: 2.0,
            attackSpeed: 1.5,
            range: 1.0,
            experience: 15,
            gold: 8,
            score: 15
        });
        
        // 坦克敌人
        this._enemyStats.set(EnemyType.TANK, {
            health: 150,
            maxHealth: 150,
            attack: 15,
            defense: 8,
            speed: 0.5,
            attackSpeed: 0.8,
            range: 1.0,
            experience: 25,
            gold: 15,
            score: 25
        });
        
        // 飞行敌人
        this._enemyStats.set(EnemyType.FLYING, {
            health: 40,
            maxHealth: 40,
            attack: 12,
            defense: 0,
            speed: 1.5,
            attackSpeed: 1.2,
            range: 1.5,
            experience: 20,
            gold: 12,
            score: 20
        });
        
        // 远程敌人
        this._enemyStats.set(EnemyType.RANGED, {
            health: 60,
            maxHealth: 60,
            attack: 18,
            defense: 3,
            speed: 0.8,
            attackSpeed: 0.6,
            range: 3.0,
            experience: 18,
            gold: 10,
            score: 18
        });
        
        // Boss敌人
        this._enemyStats.set(EnemyType.BOSS, {
            health: 500,
            maxHealth: 500,
            attack: 50,
            defense: 15,
            speed: 0.3,
            attackSpeed: 0.5,
            range: 2.0,
            experience: 100,
            gold: 50,
            score: 100
        });
        
        // 精英敌人
        this._enemyStats.set(EnemyType.ELITE, {
            health: 100,
            maxHealth: 100,
            attack: 25,
            defense: 5,
            speed: 1.2,
            attackSpeed: 1.0,
            range: 1.5,
            experience: 30,
            gold: 20,
            score: 30
        });
        
        console.log("敌人属性数据初始化完成");
    }
    
    /**
     * 初始化路径点
     */
    private initializePathPoints(): void {
        // 这里应该从场景中获取路径点，暂时使用硬编码
        this._pathPoints = [
            { position: new Vec3(-10, 0, 0), waitTime: 0, isCheckpoint: false },
            { position: new Vec3(-5, 0, 0), waitTime: 0, isCheckpoint: false },
            { position: new Vec3(0, 0, 0), waitTime: 0, isCheckpoint: true },
            { position: new Vec3(5, 0, 0), waitTime: 0, isCheckpoint: false },
            { position: new Vec3(10, 0, 0), waitTime: 0, isCheckpoint: true }
        ];
        
        console.log(`初始化了 ${this._pathPoints.length} 个路径点`);
    }
    
    /**
     * 开始敌人系统
     */
    public startEnemySystem(): void {
        console.log("开始敌人系统");
        this._isActive = true;
        this._isSpawning = true;
        this._totalEnemiesSpawned = 0;
        this._totalEnemiesKilled = 0;
    }
    
    /**
     * 停止敌人系统
     */
    public stopEnemySystem(): void {
        console.log("停止敌人系统");
        this._isActive = false;
        this._isSpawning = false;
        this.clearAllEnemies();
    }
    
    /**
     * 生成敌人
     */
    public spawnEnemy(enemyType: EnemyType, position?: Vec3): string | null {
        if (!this._isActive) {
            console.warn("敌人系统未激活");
            return null;
        }
        
        const stats = this._enemyStats.get(enemyType);
        if (!stats) {
            console.error(`敌人类型不存在: ${enemyType}`);
            return null;
        }
        
        const spawnPos = position || this._spawnPosition;
        const enemyId = this.generateEnemyId();
        
        const enemyData: IEnemyData = {
            id: enemyId,
            enemyType: enemyType,
            state: EnemyState.IDLE,
            stats: { ...stats },
            position: spawnPos,
            targetPosition: spawnPos,
            currentNode: 0,
            isActive: true,
            lastAttackTime: 0,
            effects: new Map()
        };
        
        this._enemies.set(enemyId, enemyData);
        this._totalEnemiesSpawned++;
        
        console.log(`生成敌人: ${EnemyType[enemyType]} (${enemyId})`);
        
        // 开始移动
        this.startEnemyMovement(enemyId);
        
        return enemyId;
    }
    
    /**
     * 开始敌人移动
     */
    private startEnemyMovement(enemyId: string): void {
        const enemy = this._enemies.get(enemyId);
        if (!enemy) return;
        
        enemy.state = EnemyState.MOVING;
        this.moveToNextNode(enemyId);
    }
    
    /**
     * 移动到下一个节点
     */
    private moveToNextNode(enemyId: string): void {
        const enemy = this._enemies.get(enemyId);
        if (!enemy) return;
        
        if (enemy.currentNode >= this._pathPoints.length) {
            // 到达终点
            this.onEnemyReachedEnd(enemyId);
            return;
        }
        
        const pathPoint = this._pathPoints[enemy.currentNode];
        enemy.targetPosition = pathPoint.position;
        enemy.state = EnemyState.MOVING;
        
        console.log(`敌人 ${enemyId} 移动到节点 ${enemy.currentNode}`);
    }
    
    /**
     * 敌人到达终点
     */
    private onEnemyReachedEnd(enemyId: string): void {
        const enemy = this._enemies.get(enemyId);
        if (!enemy) return;
        
        console.log(`敌人 ${enemyId} 到达终点`);
        
        // 造成伤害（减少玩家生命值）
        this.damagePlayer(enemy);
        
        // 移除敌人
        this.removeEnemy(enemyId);
    }
    
    /**
     * 对玩家造成伤害
     */
    private damagePlayer(enemy: IEnemyData): void {
        console.log(`敌人 ${enemy.id} 对玩家造成 ${enemy.stats.attack} 点伤害`);
        // 这里应该通知游戏管理器减少玩家生命值
    }
    
    /**
     * 攻击敌人
     */
    public attackEnemy(enemyId: string, damage: number): boolean {
        const enemy = this._enemies.get(enemyId);
        if (!enemy || !enemy.isActive) {
            return false;
        }
        
        // 计算实际伤害
        const actualDamage = Math.max(1, damage - enemy.stats.defense);
        enemy.stats.health -= actualDamage;
        
        console.log(`敌人 ${enemyId} 受到 ${actualDamage} 点伤害，剩余生命值: ${enemy.stats.health}`);
        
        // 检查是否死亡
        if (enemy.stats.health <= 0) {
            this.killEnemy(enemyId);
        }
        
        return true;
    }
    
    /**
     * 杀死敌人
     */
    private killEnemy(enemyId: string): void {
        const enemy = this._enemies.get(enemyId);
        if (!enemy) return;
        
        enemy.state = EnemyState.DYING;
        enemy.isActive = false;
        this._totalEnemiesKilled++;
        
        console.log(`敌人 ${enemyId} 被杀死`);
        
        // 给予奖励
        this.giveRewards(enemy);
        
        // 延迟移除敌人（播放死亡动画）
        this.scheduleOnce(() => {
            this.removeEnemy(enemyId);
        }, 1.0);
    }
    
    /**
     * 给予奖励
     */
    private giveRewards(enemy: IEnemyData): void {
        console.log(`获得奖励 - 经验: ${enemy.stats.experience}, 金币: ${enemy.stats.gold}, 分数: ${enemy.stats.score}`);
        // 这里应该通知游戏管理器给予奖励
    }
    
    /**
     * 移除敌人
     */
    private removeEnemy(enemyId: string): void {
        const enemy = this._enemies.get(enemyId);
        if (enemy) {
            enemy.state = EnemyState.DEAD;
            this._enemies.delete(enemyId);
            console.log(`移除敌人: ${enemyId}`);
        }
    }
    
    /**
     * 添加状态效果
     */
    public addEffect(enemyId: string, effectType: string, duration: number, value: any): void {
        const enemy = this._enemies.get(enemyId);
        if (!enemy) return;
        
        enemy.effects.set(effectType, {
            duration: duration,
            value: value,
            startTime: Date.now()
        });
        
        console.log(`敌人 ${enemyId} 获得效果: ${effectType}`);
    }
    
    /**
     * 移除状态效果
     */
    public removeEffect(enemyId: string, effectType: string): void {
        const enemy = this._enemies.get(enemyId);
        if (!enemy) return;
        
        enemy.effects.delete(effectType);
        console.log(`敌人 ${enemyId} 失去效果: ${effectType}`);
    }
    
    /**
     * 更新状态效果
     */
    private updateEffects(enemyId: string, deltaTime: number): void {
        const enemy = this._enemies.get(enemyId);
        if (!enemy) return;
        
        const currentTime = Date.now();
        const effectsToRemove: string[] = [];
        
        for (const [effectType, effect] of enemy.effects) {
            const elapsed = (currentTime - effect.startTime) / 1000;
            if (elapsed >= effect.duration) {
                effectsToRemove.push(effectType);
            } else {
                this.applyEffect(enemy, effectType, effect, deltaTime);
            }
        }
        
        effectsToRemove.forEach(effectType => {
            this.removeEffect(enemyId, effectType);
        });
    }
    
    /**
     * 应用状态效果
     */
    private applyEffect(enemy: IEnemyData, effectType: string, effect: any, deltaTime: number): void {
        switch (effectType) {
            case "burning":
                // 燃烧效果：持续伤害
                this.attackEnemy(enemy.id, effect.value * deltaTime);
                break;
            case "frozen":
                // 冰冻效果：减速
                enemy.stats.speed *= 0.5;
                break;
            case "stunned":
                // 眩晕效果：无法移动和攻击
                enemy.state = EnemyState.STUNNED;
                break;
        }
    }
    
    /**
     * 清理所有敌人
     */
    private clearAllEnemies(): void {
        this._enemies.clear();
        console.log("清理所有敌人");
    }
    
    /**
     * 生成敌人ID
     */
    private generateEnemyId(): string {
        return `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 获取敌人数据
     */
    public getEnemy(enemyId: string): IEnemyData | null {
        return this._enemies.get(enemyId) || null;
    }
    
    /**
     * 获取所有敌人
     */
    public getAllEnemies(): IEnemyData[] {
        return Array.from(this._enemies.values());
    }
    
    /**
     * 获取活跃敌人
     */
    public getActiveEnemies(): IEnemyData[] {
        return Array.from(this._enemies.values()).filter(enemy => enemy.isActive);
    }
    
    /**
     * 获取指定类型的敌人
     */
    public getEnemiesByType(enemyType: EnemyType): IEnemyData[] {
        return Array.from(this._enemies.values()).filter(enemy => 
            enemy.enemyType === enemyType && enemy.isActive
        );
    }
    
    /**
     * 获取指定范围内的敌人
     */
    public getEnemiesInRange(position: Vec3, range: number): IEnemyData[] {
        return Array.from(this._enemies.values()).filter(enemy => {
            if (!enemy.isActive) return false;
            const distance = Vec3.distance(position, enemy.position);
            return distance <= range;
        });
    }
    
    /**
     * 获取总生成敌人数量
     */
    public getTotalEnemiesSpawned(): number {
        return this._totalEnemiesSpawned;
    }
    
    /**
     * 获取总杀死敌人数量
     */
    public getTotalEnemiesKilled(): number {
        return this._totalEnemiesKilled;
    }
    
    /**
     * 检查是否激活
     */
    public isActive(): boolean {
        return this._isActive;
    }
    
    update(deltaTime: number) {
        if (!this._isActive) return;
        
        // 更新所有敌人
        for (const enemy of this._enemies.values()) {
            if (!enemy.isActive) continue;
            
            this.updateEnemy(enemy, deltaTime);
        }
    }
    
    /**
     * 更新单个敌人
     */
    private updateEnemy(enemy: IEnemyData, deltaTime: number): void {
        // 更新状态效果
        this.updateEffects(enemy.id, deltaTime);
        
        // 根据状态更新敌人
        switch (enemy.state) {
            case EnemyState.MOVING:
                this.updateEnemyMovement(enemy, deltaTime);
                break;
            case EnemyState.ATTACKING:
                this.updateEnemyAttack(enemy, deltaTime);
                break;
            case EnemyState.DYING:
                this.updateEnemyDying(enemy, deltaTime);
                break;
        }
    }
    
    /**
     * 更新敌人移动
     */
    private updateEnemyMovement(enemy: IEnemyData, deltaTime: number): void {
        const direction = enemy.targetPosition.clone().subtract(enemy.position).normalize();
        const moveDistance = enemy.stats.speed * deltaTime;
        
        enemy.position.add(direction.multiplyScalar(moveDistance));
        
        // 检查是否到达目标点
        const distance = Vec3.distance(enemy.position, enemy.targetPosition);
        if (distance < 0.1) {
            // 到达当前节点，移动到下一个节点
            enemy.currentNode++;
            this.moveToNextNode(enemy.id);
        }
    }
    
    /**
     * 更新敌人攻击
     */
    private updateEnemyAttack(enemy: IEnemyData, deltaTime: number): void {
        // 这里实现攻击逻辑
    }
    
    /**
     * 更新敌人死亡
     */
    private updateEnemyDying(enemy: IEnemyData, deltaTime: number): void {
        // 这里实现死亡动画逻辑
    }
    
    onDestroy() {
        if (EnemySystem._instance === this) {
            EnemySystem._instance = null;
        }
    }
}
