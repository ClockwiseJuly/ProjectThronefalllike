import { _decorator, Component, Node, Vec3, instantiate, Prefab } from 'cc';
import { GameState, GameStateType } from '../../Core/GameState';
const { ccclass, property } = _decorator;

/**
 * 塔的类型枚举
 */
export enum TowerType {
    ARROW_TOWER = 0,    // 箭塔
    CANNON_TOWER = 1,   // 炮塔
    MAGIC_TOWER = 2,    // 魔法塔
    ICE_TOWER = 3,      // 冰塔
    FIRE_TOWER = 4,     // 火塔
    LIGHTNING_TOWER = 5, // 闪电塔
}

/**
 * 塔的等级枚举
 */
export enum TowerLevel {
    LEVEL_1 = 1,
    LEVEL_2 = 2,
    LEVEL_3 = 3,
    LEVEL_4 = 4,
    LEVEL_5 = 5,
}

/**
 * 塔的属性接口
 */
export interface ITowerStats {
    damage: number;         // 伤害
    range: number;          // 射程
    attackSpeed: number;    // 攻击速度（每秒攻击次数）
    cost: number;           // 建造费用
    sellPrice: number;      // 出售价格
    upgradeCost: number;    // 升级费用
    specialEffect?: string; // 特殊效果
}

/**
 * 塔的数据接口
 */
export interface ITowerData {
    id: string;
    towerType: TowerType;
    level: TowerLevel;
    position: Vec3;
    stats: ITowerStats;
    isActive: boolean;
    lastAttackTime: number;
    targetEnemyId?: string;
}

/**
 * 波次数据接口
 */
export interface IWaveData {
    waveNumber: number;
    enemyCount: number;
    enemyTypes: string[];
    spawnInterval: number;
    isBossWave: boolean;
    isCompleted: boolean;
}

/**
 * 塔防系统
 * 负责塔防模式的所有逻辑，包括塔的建造、升级、攻击等
 */
@ccclass('TowerDefenseSystem')
export class TowerDefenseSystem extends Component {
    private static _instance: TowerDefenseSystem = null;
    
    @property(Node)
    public towerContainer: Node = null; // 塔的容器节点
    
    @property(Node)
    public enemyContainer: Node = null; // 敌人的容器节点
    
    @property(Node)
    public pathContainer: Node = null; // 路径的容器节点
    
    @property([Prefab])
    public towerPrefabs: Prefab[] = []; // 塔的预制体数组
    
    @property([Prefab])
    public enemyPrefabs: Prefab[] = []; // 敌人的预制体数组
    
    // 游戏状态
    private _isActive: boolean = false;
    private _currentWave: number = 0;
    private _totalWaves: number = 10;
    private _gameTime: number = 0;
    private _gold: number = 1000;
    private _lives: number = 20;
    private _score: number = 0;
    
    // 塔的管理
    private _towers: Map<string, ITowerData> = new Map();
    private _towerStats: Map<TowerType, Map<TowerLevel, ITowerStats>> = new Map();
    
    // 波次管理
    private _waves: IWaveData[] = [];
    private _currentWaveData: IWaveData = null;
    private _waveStartTime: number = 0;
    private _enemiesSpawned: number = 0;
    
    // 路径点
    private _pathPoints: Vec3[] = [];
    
    /**
     * 获取单例实例
     */
    public static getInstance(): TowerDefenseSystem {
        return TowerDefenseSystem._instance;
    }
    
    onLoad() {
        if (TowerDefenseSystem._instance === null) {
            TowerDefenseSystem._instance = this;
            this.initializeTowerDefense();
        } else {
            this.node.destroy();
        }
    }
    
    /**
     * 初始化塔防系统
     */
    private initializeTowerDefense(): void {
        console.log("塔防系统初始化");
        
        // 初始化塔的属性数据
        this.initializeTowerStats();
        
        // 初始化波次数据
        this.initializeWaves();
        
        // 初始化路径点
        this.initializePathPoints();
        
        // 注册游戏状态监听
        const gameState = GameState.getInstance();
        gameState.onStateEnter(GameStateType.TOWER_DEFENSE, () => {
            this.startTowerDefense();
        });
        
        gameState.onStateExit(GameStateType.TOWER_DEFENSE, () => {
            this.stopTowerDefense();
        });
    }
    
    /**
     * 初始化塔的属性数据
     */
    private initializeTowerStats(): void {
        // 箭塔属性
        const arrowTowerStats = new Map<TowerLevel, ITowerStats>();
        arrowTowerStats.set(TowerLevel.LEVEL_1, {
            damage: 25,
            range: 3.0,
            attackSpeed: 1.0,
            cost: 100,
            sellPrice: 75,
            upgradeCost: 150,
            specialEffect: "穿透"
        });
        arrowTowerStats.set(TowerLevel.LEVEL_2, {
            damage: 40,
            range: 3.5,
            attackSpeed: 1.2,
            cost: 150,
            sellPrice: 112,
            upgradeCost: 200,
            specialEffect: "双箭"
        });
        arrowTowerStats.set(TowerLevel.LEVEL_3, {
            damage: 60,
            range: 4.0,
            attackSpeed: 1.5,
            cost: 200,
            sellPrice: 150,
            upgradeCost: 300,
            specialEffect: "三箭"
        });
        this._towerStats.set(TowerType.ARROW_TOWER, arrowTowerStats);
        
        // 炮塔属性
        const cannonTowerStats = new Map<TowerLevel, ITowerStats>();
        cannonTowerStats.set(TowerLevel.LEVEL_1, {
            damage: 80,
            range: 2.5,
            attackSpeed: 0.5,
            cost: 200,
            sellPrice: 150,
            upgradeCost: 300,
            specialEffect: "范围伤害"
        });
        cannonTowerStats.set(TowerLevel.LEVEL_2, {
            damage: 120,
            range: 3.0,
            attackSpeed: 0.6,
            cost: 300,
            sellPrice: 225,
            upgradeCost: 400,
            specialEffect: "大范围伤害"
        });
        this._towerStats.set(TowerType.CANNON_TOWER, cannonTowerStats);
        
        // 魔法塔属性
        const magicTowerStats = new Map<TowerLevel, ITowerStats>();
        magicTowerStats.set(TowerLevel.LEVEL_1, {
            damage: 50,
            range: 4.0,
            attackSpeed: 0.8,
            cost: 300,
            sellPrice: 225,
            upgradeCost: 450,
            specialEffect: "魔法伤害"
        });
        this._towerStats.set(TowerType.MAGIC_TOWER, magicTowerStats);
        
        console.log("塔属性数据初始化完成");
    }
    
    /**
     * 初始化波次数据
     */
    private initializeWaves(): void {
        for (let i = 1; i <= this._totalWaves; i++) {
            const waveData: IWaveData = {
                waveNumber: i,
                enemyCount: Math.floor(5 + i * 2),
                enemyTypes: this.getEnemyTypesForWave(i),
                spawnInterval: Math.max(0.5, 2.0 - i * 0.1),
                isBossWave: i % 5 === 0,
                isCompleted: false
            };
            this._waves.push(waveData);
        }
        
        console.log(`初始化了 ${this._totalWaves} 个波次`);
    }
    
    /**
     * 获取波次对应的敌人类型
     */
    private getEnemyTypesForWave(waveNumber: number): string[] {
        const enemyTypes = ["BasicEnemy", "FastEnemy", "TankEnemy", "FlyingEnemy"];
        const types: string[] = [];
        
        // 根据波次选择敌人类型
        if (waveNumber <= 3) {
            types.push("BasicEnemy");
        } else if (waveNumber <= 6) {
            types.push("BasicEnemy", "FastEnemy");
        } else if (waveNumber <= 9) {
            types.push("BasicEnemy", "FastEnemy", "TankEnemy");
        } else {
            types.push("BasicEnemy", "FastEnemy", "TankEnemy", "FlyingEnemy");
        }
        
        return types;
    }
    
    /**
     * 初始化路径点
     */
    private initializePathPoints(): void {
        // 这里应该从场景中获取路径点，暂时使用硬编码
        this._pathPoints = [
            new Vec3(-10, 0, 0),
            new Vec3(-5, 0, 0),
            new Vec3(0, 0, 0),
            new Vec3(5, 0, 0),
            new Vec3(10, 0, 0)
        ];
        
        console.log(`初始化了 ${this._pathPoints.length} 个路径点`);
    }
    
    /**
     * 开始塔防模式
     */
    public startTowerDefense(): void {
        console.log("开始塔防模式");
        this._isActive = true;
        this._currentWave = 0;
        this._gameTime = 0;
        this._gold = 1000;
        this._lives = 20;
        this._score = 0;
        
        // 开始第一波
        this.startNextWave();
    }
    
    /**
     * 停止塔防模式
     */
    public stopTowerDefense(): void {
        console.log("停止塔防模式");
        this._isActive = false;
        this.clearAllTowers();
        this.clearAllEnemies();
    }
    
    /**
     * 开始下一波
     */
    public startNextWave(): void {
        if (this._currentWave >= this._totalWaves) {
            console.log("所有波次已完成，游戏胜利！");
            this.onGameVictory();
            return;
        }
        
        this._currentWave++;
        this._currentWaveData = this._waves[this._currentWave - 1];
        this._waveStartTime = this._gameTime;
        this._enemiesSpawned = 0;
        
        console.log(`开始第 ${this._currentWave} 波，敌人数量: ${this._currentWaveData.enemyCount}`);
        
        // 开始生成敌人
        this.schedule(this.spawnEnemy, this._currentWaveData.spawnInterval);
    }
    
    /**
     * 生成敌人
     */
    private spawnEnemy(): void {
        if (!this._currentWaveData || this._enemiesSpawned >= this._currentWaveData.enemyCount) {
            this.unschedule(this.spawnEnemy);
            return;
        }
        
        // 随机选择敌人类型
        const enemyType = this._currentWaveData.enemyTypes[
            Math.floor(Math.random() * this._currentWaveData.enemyTypes.length)
        ];
        
        this.createEnemy(enemyType, this._pathPoints[0]);
        this._enemiesSpawned++;
        
        console.log(`生成敌人: ${enemyType} (${this._enemiesSpawned}/${this._currentWaveData.enemyCount})`);
    }
    
    /**
     * 创建敌人
     */
    private createEnemy(enemyType: string, position: Vec3): void {
        // 这里应该根据敌人类型创建对应的敌人实例
        console.log(`创建敌人: ${enemyType} 在位置: ${position}`);
        // 实际实现中会使用instantiate创建敌人节点
    }
    
    /**
     * 建造塔
     */
    public buildTower(towerType: TowerType, position: Vec3): boolean {
        const stats = this.getTowerStats(towerType, TowerLevel.LEVEL_1);
        if (!stats) {
            console.error(`塔类型不存在: ${towerType}`);
            return false;
        }
        
        if (this._gold < stats.cost) {
            console.warn("金币不足，无法建造塔");
            return false;
        }
        
        // 检查位置是否有效
        if (!this.isValidTowerPosition(position)) {
            console.warn("位置无效，无法建造塔");
            return false;
        }
        
        // 扣除金币
        this._gold -= stats.cost;
        
        // 创建塔
        const towerId = this.generateTowerId();
        const towerData: ITowerData = {
            id: towerId,
            towerType: towerType,
            level: TowerLevel.LEVEL_1,
            position: position,
            stats: stats,
            isActive: true,
            lastAttackTime: 0,
        };
        
        this._towers.set(towerId, towerData);
        
        console.log(`建造塔成功: ${TowerType[towerType]} 在位置: ${position}`);
        return true;
    }
    
    /**
     * 升级塔
     */
    public upgradeTower(towerId: string): boolean {
        const tower = this._towers.get(towerId);
        if (!tower) {
            console.error(`塔不存在: ${towerId}`);
            return false;
        }
        
        const nextLevel = tower.level + 1;
        const stats = this.getTowerStats(tower.towerType, nextLevel);
        if (!stats) {
            console.warn("塔已达到最高等级");
            return false;
        }
        
        if (this._gold < stats.upgradeCost) {
            console.warn("金币不足，无法升级塔");
            return false;
        }
        
        // 扣除金币
        this._gold -= stats.upgradeCost;
        
        // 更新塔的属性
        tower.level = nextLevel;
        tower.stats = stats;
        
        console.log(`升级塔成功: ${towerId} 到等级 ${nextLevel}`);
        return true;
    }
    
    /**
     * 出售塔
     */
    public sellTower(towerId: string): boolean {
        const tower = this._towers.get(towerId);
        if (!tower) {
            console.error(`塔不存在: ${towerId}`);
            return false;
        }
        
        // 获得金币
        this._gold += tower.stats.sellPrice;
        
        // 移除塔
        this._towers.delete(towerId);
        
        console.log(`出售塔成功: ${towerId}，获得金币: ${tower.stats.sellPrice}`);
        return true;
    }
    
    /**
     * 获取塔的属性
     */
    public getTowerStats(towerType: TowerType, level: TowerLevel): ITowerStats | null {
        const typeStats = this._towerStats.get(towerType);
        if (!typeStats) return null;
        
        return typeStats.get(level) || null;
    }
    
    /**
     * 检查塔的位置是否有效
     */
    private isValidTowerPosition(position: Vec3): boolean {
        // 检查是否在路径上
        for (const pathPoint of this._pathPoints) {
            if (Vec3.distance(position, pathPoint) < 1.0) {
                return false;
            }
        }
        
        // 检查是否与其他塔重叠
        for (const tower of this._towers.values()) {
            if (Vec3.distance(position, tower.position) < 1.5) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 生成塔的ID
     */
    private generateTowerId(): string {
        return `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 清理所有塔
     */
    private clearAllTowers(): void {
        this._towers.clear();
        console.log("清理所有塔");
    }
    
    /**
     * 清理所有敌人
     */
    private clearAllEnemies(): void {
        // 这里实现清理所有敌人的逻辑
        console.log("清理所有敌人");
    }
    
    /**
     * 游戏胜利
     */
    private onGameVictory(): void {
        console.log("塔防模式胜利！");
        // 这里可以触发胜利逻辑，比如切换到肉鸽模式
    }
    
    /**
     * 游戏失败
     */
    private onGameDefeat(): void {
        console.log("塔防模式失败！");
        // 这里可以触发失败逻辑
    }
    
    /**
     * 获取当前金币
     */
    public getGold(): number {
        return this._gold;
    }
    
    /**
     * 获取当前生命值
     */
    public getLives(): number {
        return this._lives;
    }
    
    /**
     * 获取当前分数
     */
    public getScore(): number {
        return this._score;
    }
    
    /**
     * 获取当前波次
     */
    public getCurrentWave(): number {
        return this._currentWave;
    }
    
    /**
     * 获取总波次数
     */
    public getTotalWaves(): number {
        return this._totalWaves;
    }
    
    /**
     * 检查是否激活
     */
    public isActive(): boolean {
        return this._isActive;
    }
    
    update(deltaTime: number) {
        if (!this._isActive) return;
        
        this._gameTime += deltaTime;
        
        // 更新塔的攻击逻辑
        this.updateTowers(deltaTime);
        
        // 更新敌人移动逻辑
        this.updateEnemies(deltaTime);
    }
    
    /**
     * 更新塔的逻辑
     */
    private updateTowers(deltaTime: number): void {
        for (const tower of this._towers.values()) {
            if (!tower.isActive) continue;
            
            // 寻找目标
            const target = this.findNearestEnemy(tower.position, tower.stats.range);
            if (target) {
                tower.targetEnemyId = target;
                
                // 检查是否可以攻击
                const currentTime = this._gameTime;
                if (currentTime - tower.lastAttackTime >= 1.0 / tower.stats.attackSpeed) {
                    this.attackEnemy(tower, target);
                    tower.lastAttackTime = currentTime;
                }
            }
        }
    }
    
    /**
     * 更新敌人的逻辑
     */
    private updateEnemies(deltaTime: number): void {
        // 这里实现敌人移动和到达终点的逻辑
    }
    
    /**
     * 寻找最近的敌人
     */
    private findNearestEnemy(position: Vec3, range: number): string | null {
        // 这里实现寻找范围内最近敌人的逻辑
        return null;
    }
    
    /**
     * 攻击敌人
     */
    private attackEnemy(tower: ITowerData, enemyId: string): void {
        console.log(`塔 ${tower.id} 攻击敌人 ${enemyId}`);
        // 这里实现攻击逻辑
    }
    
    onDestroy() {
        if (TowerDefenseSystem._instance === this) {
            TowerDefenseSystem._instance = null;
        }
    }
}
