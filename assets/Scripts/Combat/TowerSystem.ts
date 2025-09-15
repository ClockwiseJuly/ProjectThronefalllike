import { _decorator, Vec2, Node } from 'cc';
import { logger, LogCategory } from '../Core/Logger';
import { eventBus, EventType } from '../Core/EventBus';
import { resourceManager } from '../Core/ResourceManager';
import { gameState } from '../Core/GameState';
import { BaseCharacter, CharacterCamp } from '../Character/BaseCharacter';
import { combatSystem } from './CombatSystem';

/**
 * 塔防单位类型枚举
 */
export enum TowerType {
    /** 基础攻击塔 */
    BASIC = 'basic',
    /** 范围攻击塔 */
    AOE = 'aoe',
    /** 减速塔 */
    SLOW = 'slow',
    /** 增益塔 */
    BUFF = 'buff',
    /** 资源塔 */
    RESOURCE = 'resource'
}

/**
 * 塔防单位等级
 */
export enum TowerLevel {
    /** 一级塔 */
    LEVEL_1 = 1,
    /** 二级塔 */
    LEVEL_2 = 2,
    /** 三级塔 */
    LEVEL_3 = 3,
    /** 四级塔 */
    LEVEL_4 = 4
}

/**
 * 塔防单位信息接口
 */
export interface ITowerInfo {
    /** 塔防单位类型 */
    type: TowerType;
    /** 塔防单位等级 */
    level: TowerLevel;
    /** 塔防单位名称 */
    name: string;
    /** 塔防单位描述 */
    description: string;
    /** 塔防单位预制体路径 */
    prefabPath: string;
    /** 塔防单位图标路径 */
    iconPath: string;
    /** 塔防单位建造成本 */
    buildCost: number;
    /** 塔防单位升级成本 */
    upgradeCost: number;
    /** 塔防单位出售价值 */
    sellValue: number;
    /** 塔防单位属性 */
    attributes: {
        /** 攻击力 */
        attack: number;
        /** 攻击速度 */
        attackSpeed: number;
        /** 攻击范围 */
        attackRange: number;
        /** 特殊效果 */
        effects?: any;
    };
    /** 下一级塔防单位类型 */
    nextLevel?: TowerType;
}

/**
 * 塔防格子状态枚举
 */
export enum GridState {
    /** 空闲（可建造） */
    EMPTY = 'empty',
    /** 已占用（已建造塔防单位） */
    OCCUPIED = 'occupied',
    /** 不可用（不可建造） */
    UNAVAILABLE = 'unavailable'
}

/**
 * 塔防格子信息接口
 */
export interface IGridInfo {
    /** 格子位置 */
    position: Vec2;
    /** 格子状态 */
    state: GridState;
    /** 格子上的塔防单位 */
    tower?: BaseCharacter;
    /** 格子索引 */
    index: number;
}

/**
 * 塔防系统
 * 负责管理塔防单位的建造、升级、出售等操作
 */
export class TowerSystem {
    private static _instance: TowerSystem = null;
    
    /** 塔防单位配置信息 */
    private _towerConfigs: Map<string, ITowerInfo> = new Map();
    /** 已建造的塔防单位 */
    private _builtTowers: Map<string, BaseCharacter> = new Map();
    /** 塔防格子信息 */
    private _gridInfos: IGridInfo[] = [];
    /** 当前选中的格子索引 */
    private _selectedGridIndex: number = -1;
    /** 当前选中的塔防单位 */
    private _selectedTower: BaseCharacter = null;
    /** 资源数量 */
    private _resources: number = 0;
    /** 是否启用塔防模式 */
    private _towerDefenseEnabled: boolean = false;
    
    /**
     * 获取单例实例
     */
    public static getInstance(): TowerSystem {
        if (!this._instance) {
            this._instance = new TowerSystem();
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
     * 初始化塔防系统
     */
    private _initialize(): void {
        logger.info(LogCategory.TOWER, '塔防系统初始化');
        
        // 注册事件监听
        this._registerEvents();
        
        // 初始化塔防单位配置
        this._initTowerConfigs();
    }
    
    /**
     * 注册事件监听
     */
    private _registerEvents(): void {
        // 游戏状态变化事件
        eventBus.on(EventType.GAME_STATE_CHANGED, this._onGameStateChanged, this);
        // 日夜切换事件
        eventBus.on(EventType.DAY_NIGHT_CHANGED, this._onDayNightChanged, this);
        // 资源变化事件
        eventBus.on(EventType.RESOURCE_CHANGED, this._onResourceChanged, this);
    }
    
    /**
     * 初始化塔防单位配置
     */
    private _initTowerConfigs(): void {
        // 基础攻击塔 - 一级
        this._towerConfigs.set(`${TowerType.BASIC}_${TowerLevel.LEVEL_1}`, {
            type: TowerType.BASIC,
            level: TowerLevel.LEVEL_1,
            name: '基础攻击塔 I',
            description: '基础的攻击塔，对单一目标造成物理伤害',
            prefabPath: 'prefabs/towers/basic_tower_1',
            iconPath: 'textures/ui/towers/basic_tower_1_icon',
            buildCost: 100,
            upgradeCost: 150,
            sellValue: 75,
            attributes: {
                attack: 10,
                attackSpeed: 1.0,
                attackRange: 150
            },
            nextLevel: TowerType.BASIC
        });
        
        // 基础攻击塔 - 二级
        this._towerConfigs.set(`${TowerType.BASIC}_${TowerLevel.LEVEL_2}`, {
            type: TowerType.BASIC,
            level: TowerLevel.LEVEL_2,
            name: '基础攻击塔 II',
            description: '升级版攻击塔，提高攻击力和攻击速度',
            prefabPath: 'prefabs/towers/basic_tower_2',
            iconPath: 'textures/ui/towers/basic_tower_2_icon',
            buildCost: 250,
            upgradeCost: 200,
            sellValue: 187,
            attributes: {
                attack: 20,
                attackSpeed: 1.2,
                attackRange: 170
            },
            nextLevel: TowerType.BASIC
        });
        
        // 范围攻击塔 - 一级
        this._towerConfigs.set(`${TowerType.AOE}_${TowerLevel.LEVEL_1}`, {
            type: TowerType.AOE,
            level: TowerLevel.LEVEL_1,
            name: '范围攻击塔 I',
            description: '对范围内的敌人造成伤害',
            prefabPath: 'prefabs/towers/aoe_tower_1',
            iconPath: 'textures/ui/towers/aoe_tower_1_icon',
            buildCost: 150,
            upgradeCost: 200,
            sellValue: 112,
            attributes: {
                attack: 8,
                attackSpeed: 0.8,
                attackRange: 120,
                effects: {
                    aoeRadius: 80
                }
            },
            nextLevel: TowerType.AOE
        });
        
        // 减速塔 - 一级
        this._towerConfigs.set(`${TowerType.SLOW}_${TowerLevel.LEVEL_1}`, {
            type: TowerType.SLOW,
            level: TowerLevel.LEVEL_1,
            name: '减速塔 I',
            description: '减缓敌人移动速度',
            prefabPath: 'prefabs/towers/slow_tower_1',
            iconPath: 'textures/ui/towers/slow_tower_1_icon',
            buildCost: 120,
            upgradeCost: 180,
            sellValue: 90,
            attributes: {
                attack: 5,
                attackSpeed: 1.0,
                attackRange: 130,
                effects: {
                    slowPercent: 30,
                    slowDuration: 2.0
                }
            },
            nextLevel: TowerType.SLOW
        });
        
        // 资源塔 - 一级
        this._towerConfigs.set(`${TowerType.RESOURCE}_${TowerLevel.LEVEL_1}`, {
            type: TowerType.RESOURCE,
            level: TowerLevel.LEVEL_1,
            name: '资源塔 I',
            description: '定期产生资源',
            prefabPath: 'prefabs/towers/resource_tower_1',
            iconPath: 'textures/ui/towers/resource_tower_1_icon',
            buildCost: 200,
            upgradeCost: 250,
            sellValue: 150,
            attributes: {
                attack: 0,
                attackSpeed: 0,
                attackRange: 0,
                effects: {
                    resourceRate: 10,
                    resourceInterval: 10.0
                }
            },
            nextLevel: TowerType.RESOURCE
        });
    }
    
    /**
     * 游戏状态变化事件处理
     * @param newState 新状态
     * @param oldState 旧状态
     */
    private _onGameStateChanged(newState: string, oldState: string): void {
        // 根据游戏状态调整塔防系统行为
        logger.debug(LogCategory.TOWER, `游戏状态变化: ${oldState} -> ${newState}`);
    }
    
    /**
     * 日夜切换事件处理
     * @param isNight 是否为夜晚
     */
    private _onDayNightChanged(isNight: boolean): void {
        // 根据日夜状态调整塔防系统行为
        logger.debug(LogCategory.TOWER, `日夜切换: ${isNight ? '夜晚' : '白天'}`);
        
        // 在日夜切换时调整塔防系统状态
        this._towerDefenseEnabled = !isNight;
        
        // 通知UI更新
        eventBus.emit(EventType.TOWER_SYSTEM_STATE_CHANGED, this._towerDefenseEnabled);
    }
    
    /**
     * 资源变化事件处理
     * @param resources 资源数量
     */
    private _onResourceChanged(resources: number): void {
        this._resources = resources;
        logger.debug(LogCategory.TOWER, `资源变化: ${resources}`);
    }
    
    /**
     * 初始化塔防格子
     * @param gridPositions 格子位置数组
     */
    public initializeGrids(gridPositions: Vec2[]): void {
        this._gridInfos = [];
        
        // 创建格子信息
        for (let i = 0; i < gridPositions.length; i++) {
            this._gridInfos.push({
                position: gridPositions[i],
                state: GridState.EMPTY,
                index: i
            });
        }
        
        logger.info(LogCategory.TOWER, `初始化塔防格子: ${gridPositions.length}个`);
        
        // 通知UI更新
        eventBus.emit(EventType.TOWER_GRIDS_INITIALIZED, this._gridInfos);
    }
    
    /**
     * 选择格子
     * @param gridIndex 格子索引
     */
    public selectGrid(gridIndex: number): void {
        if (gridIndex < 0 || gridIndex >= this._gridInfos.length) {
            logger.warn(LogCategory.TOWER, `选择的格子索引无效: ${gridIndex}`);
            return;
        }
        
        // 更新选中的格子索引
        this._selectedGridIndex = gridIndex;
        const gridInfo = this._gridInfos[gridIndex];
        
        // 如果格子上有塔防单位，则选中该塔防单位
        if (gridInfo.state === GridState.OCCUPIED && gridInfo.tower) {
            this._selectedTower = gridInfo.tower;
        } else {
            this._selectedTower = null;
        }
        
        // 通知UI更新
        eventBus.emit(EventType.TOWER_GRID_SELECTED, {
            gridIndex: this._selectedGridIndex,
            gridInfo: gridInfo,
            tower: this._selectedTower
        });
    }
    
    /**
     * 取消选择
     */
    public deselectGrid(): void {
        this._selectedGridIndex = -1;
        this._selectedTower = null;
        
        // 通知UI更新
        eventBus.emit(EventType.TOWER_GRID_DESELECTED);
    }
    
    /**
     * 建造塔防单位
     * @param gridIndex 格子索引
     * @param towerType 塔防单位类型
     * @returns 是否建造成功
     */
    public buildTower(gridIndex: number, towerType: TowerType): boolean {
        // 检查塔防模式是否启用
        if (!this._towerDefenseEnabled) {
            logger.warn(LogCategory.TOWER, '塔防模式未启用，无法建造塔防单位');
            return false;
        }
        
        // 检查格子索引是否有效
        if (gridIndex < 0 || gridIndex >= this._gridInfos.length) {
            logger.warn(LogCategory.TOWER, `建造塔防单位失败: 格子索引无效 ${gridIndex}`);
            return false;
        }
        
        // 检查格子状态
        const gridInfo = this._gridInfos[gridIndex];
        if (gridInfo.state !== GridState.EMPTY) {
            logger.warn(LogCategory.TOWER, `建造塔防单位失败: 格子已占用或不可用 ${gridIndex}`);
            return false;
        }
        
        // 获取塔防单位配置
        const towerConfig = this._towerConfigs.get(`${towerType}_${TowerLevel.LEVEL_1}`);
        if (!towerConfig) {
            logger.warn(LogCategory.TOWER, `建造塔防单位失败: 未找到塔防单位配置 ${towerType}`);
            return false;
        }
        
        // 检查资源是否足够
        if (this._resources < towerConfig.buildCost) {
            logger.warn(LogCategory.TOWER, `建造塔防单位失败: 资源不足 ${this._resources}/${towerConfig.buildCost}`);
            return false;
        }
        
        // 加载塔防单位预制体
        resourceManager.loadPrefab(towerConfig.prefabPath, (prefab) => {
            if (!prefab) {
                logger.error(LogCategory.TOWER, `建造塔防单位失败: 加载预制体失败 ${towerConfig.prefabPath}`);
                return;
            }
            
            // 创建塔防单位节点
            const towerNode = new Node(towerConfig.name);
            // 这里应该添加相关组件，如BaseCharacter组件
            // 在实际项目中，应该通过实例化预制体来创建塔防单位
            
            // 设置塔防单位位置
            towerNode.setPosition(gridInfo.position.x, gridInfo.position.y, 0);
            
            // 创建塔防单位实例
            // 注意：这里简化处理，实际应该通过预制体实例化并获取BaseCharacter组件
            // const tower = towerNode.getComponent(BaseCharacter);
            // 临时创建一个BaseCharacter实例用于演示
            const tower = new BaseCharacter();
            tower.id = `tower_${Date.now()}_${gridIndex}`;
            tower.camp = CharacterCamp.ALLY;
            tower.isTowerUnit = true;
            
            // 设置塔防单位属性
            tower.attributes = {
                ...tower.attributes,
                attack: towerConfig.attributes.attack,
                attackSpeed: towerConfig.attributes.attackSpeed,
                attackRange: towerConfig.attributes.attackRange,
                // 其他属性...
            };
            
            // 更新格子信息
            gridInfo.state = GridState.OCCUPIED;
            gridInfo.tower = tower;
            
            // 添加到已建造的塔防单位列表
            this._builtTowers.set(tower.id, tower);
            
            // 扣除资源
            this._resources -= towerConfig.buildCost;
            eventBus.emit(EventType.RESOURCE_CHANGED, this._resources);
            
            // 通知战斗系统
            eventBus.emit(EventType.CHARACTER_CREATED, tower);
            
            // 通知UI更新
            eventBus.emit(EventType.TOWER_BUILT, {
                gridIndex,
                tower,
                towerConfig
            });
            
            logger.info(LogCategory.TOWER, `建造塔防单位成功: ${towerConfig.name} 在格子 ${gridIndex}`);
        });
        
        return true;
    }
    
    /**
     * 升级塔防单位
     * @param gridIndex 格子索引
     * @returns 是否升级成功
     */
    public upgradeTower(gridIndex: number): boolean {
        // 检查塔防模式是否启用
        if (!this._towerDefenseEnabled) {
            logger.warn(LogCategory.TOWER, '塔防模式未启用，无法升级塔防单位');
            return false;
        }
        
        // 检查格子索引是否有效
        if (gridIndex < 0 || gridIndex >= this._gridInfos.length) {
            logger.warn(LogCategory.TOWER, `升级塔防单位失败: 格子索引无效 ${gridIndex}`);
            return false;
        }
        
        // 检查格子状态
        const gridInfo = this._gridInfos[gridIndex];
        if (gridInfo.state !== GridState.OCCUPIED || !gridInfo.tower) {
            logger.warn(LogCategory.TOWER, `升级塔防单位失败: 格子上没有塔防单位 ${gridIndex}`);
            return false;
        }
        
        const tower = gridInfo.tower;
        
        // 获取当前塔防单位配置
        const towerType = tower.towerType || TowerType.BASIC;
        const currentLevel = tower.towerLevel || TowerLevel.LEVEL_1;
        const currentConfig = this._towerConfigs.get(`${towerType}_${currentLevel}`);
        
        if (!currentConfig) {
            logger.warn(LogCategory.TOWER, `升级塔防单位失败: 未找到当前塔防单位配置 ${towerType}_${currentLevel}`);
            return false;
        }
        
        // 检查是否有下一级
        if (!currentConfig.nextLevel || currentLevel >= TowerLevel.LEVEL_4) {
            logger.warn(LogCategory.TOWER, `升级塔防单位失败: 已达到最高等级 ${currentLevel}`);
            return false;
        }
        
        // 获取下一级塔防单位配置
        const nextLevel = currentLevel + 1;
        const nextConfig = this._towerConfigs.get(`${towerType}_${nextLevel}`);
        
        if (!nextConfig) {
            logger.warn(LogCategory.TOWER, `升级塔防单位失败: 未找到下一级塔防单位配置 ${towerType}_${nextLevel}`);
            return false;
        }
        
        // 检查资源是否足够
        if (this._resources < currentConfig.upgradeCost) {
            logger.warn(LogCategory.TOWER, `升级塔防单位失败: 资源不足 ${this._resources}/${currentConfig.upgradeCost}`);
            return false;
        }
        
        // 加载下一级塔防单位预制体
        resourceManager.loadPrefab(nextConfig.prefabPath, (prefab) => {
            if (!prefab) {
                logger.error(LogCategory.TOWER, `升级塔防单位失败: 加载预制体失败 ${nextConfig.prefabPath}`);
                return;
            }
            
            // 更新塔防单位属性
            tower.towerLevel = nextLevel;
            tower.attributes = {
                ...tower.attributes,
                attack: nextConfig.attributes.attack,
                attackSpeed: nextConfig.attributes.attackSpeed,
                attackRange: nextConfig.attributes.attackRange,
                // 其他属性...
            };
            
            // 扣除资源
            this._resources -= currentConfig.upgradeCost;
            eventBus.emit(EventType.RESOURCE_CHANGED, this._resources);
            
            // 通知UI更新
            eventBus.emit(EventType.TOWER_UPGRADED, {
                gridIndex,
                tower,
                towerConfig: nextConfig
            });
            
            logger.info(LogCategory.TOWER, `升级塔防单位成功: ${currentConfig.name} -> ${nextConfig.name} 在格子 ${gridIndex}`);
        });
        
        return true;
    }
    
    /**
     * 出售塔防单位
     * @param gridIndex 格子索引
     * @returns 是否出售成功
     */
    public sellTower(gridIndex: number): boolean {
        // 检查塔防模式是否启用
        if (!this._towerDefenseEnabled) {
            logger.warn(LogCategory.TOWER, '塔防模式未启用，无法出售塔防单位');
            return false;
        }
        
        // 检查格子索引是否有效
        if (gridIndex < 0 || gridIndex >= this._gridInfos.length) {
            logger.warn(LogCategory.TOWER, `出售塔防单位失败: 格子索引无效 ${gridIndex}`);
            return false;
        }
        
        // 检查格子状态
        const gridInfo = this._gridInfos[gridIndex];
        if (gridInfo.state !== GridState.OCCUPIED || !gridInfo.tower) {
            logger.warn(LogCategory.TOWER, `出售塔防单位失败: 格子上没有塔防单位 ${gridIndex}`);
            return false;
        }
        
        const tower = gridInfo.tower;
        
        // 获取塔防单位配置
        const towerType = tower.towerType || TowerType.BASIC;
        const towerLevel = tower.towerLevel || TowerLevel.LEVEL_1;
        const towerConfig = this._towerConfigs.get(`${towerType}_${towerLevel}`);
        
        if (!towerConfig) {
            logger.warn(LogCategory.TOWER, `出售塔防单位失败: 未找到塔防单位配置 ${towerType}_${towerLevel}`);
            return false;
        }
        
        // 从已建造的塔防单位列表中移除
        this._builtTowers.delete(tower.id);
        
        // 更新格子信息
        gridInfo.state = GridState.EMPTY;
        gridInfo.tower = null;
        
        // 增加资源
        this._resources += towerConfig.sellValue;
        eventBus.emit(EventType.RESOURCE_CHANGED, this._resources);
        
        // 通知战斗系统
        eventBus.emit(EventType.CHARACTER_DIED, tower);
        
        // 通知UI更新
        eventBus.emit(EventType.TOWER_SOLD, {
            gridIndex,
            tower,
            towerConfig
        });
        
        logger.info(LogCategory.TOWER, `出售塔防单位成功: ${towerConfig.name} 在格子 ${gridIndex}`);
        
        return true;
    }
    
    /**
     * 获取塔防单位配置
     * @param towerType 塔防单位类型
     * @param level 塔防单位等级
     * @returns 塔防单位配置
     */
    public getTowerConfig(towerType: TowerType, level: TowerLevel): ITowerInfo {
        return this._towerConfigs.get(`${towerType}_${level}`);
    }
    
    /**
     * 获取所有塔防单位配置
     * @returns 塔防单位配置列表
     */
    public getAllTowerConfigs(): ITowerInfo[] {
        return Array.from(this._towerConfigs.values());
    }
    
    /**
     * 获取可建造的塔防单位类型
     * @returns 可建造的塔防单位类型列表
     */
    public getBuildableTowerTypes(): TowerType[] {
        // 获取所有一级塔防单位类型
        const buildableTowers: TowerType[] = [];
        for (const [key, config] of this._towerConfigs.entries()) {
            if (config.level === TowerLevel.LEVEL_1 && this._resources >= config.buildCost) {
                buildableTowers.push(config.type);
            }
        }
        return buildableTowers;
    }
    
    /**
     * 获取格子信息
     * @param gridIndex 格子索引
     * @returns 格子信息
     */
    public getGridInfo(gridIndex: number): IGridInfo {
        if (gridIndex < 0 || gridIndex >= this._gridInfos.length) {
            return null;
        }
        return this._gridInfos[gridIndex];
    }
    
    /**
     * 获取所有格子信息
     * @returns 所有格子信息
     */
    public getAllGridInfos(): IGridInfo[] {
        return this._gridInfos;
    }
    
    /**
     * 获取当前选中的格子索引
     * @returns 当前选中的格子索引
     */
    public getSelectedGridIndex(): number {
        return this._selectedGridIndex;
    }
    
    /**
     * 获取当前选中的塔防单位
     * @returns 当前选中的塔防单位
     */
    public getSelectedTower(): BaseCharacter {
        return this._selectedTower;
    }
    
    /**
     * 获取资源数量
     * @returns 资源数量
     */
    public getResources(): number {
        return this._resources;
    }
    
    /**
     * 设置资源数量
     * @param resources 资源数量
     */
    public setResources(resources: number): void {
        this._resources = resources;
        eventBus.emit(EventType.RESOURCE_CHANGED, this._resources);
    }
    
    /**
     * 是否启用塔防模式
     * @returns 是否启用塔防模式
     */
    public isTowerDefenseEnabled(): boolean {
        return this._towerDefenseEnabled;
    }
    
    /**
     * 清理塔防系统
     * 在场景切换或游戏重置时调用
     */
    public cleanup(): void {
        logger.info(LogCategory.TOWER, '清理塔防系统');
        
        // 清空塔防单位列表
        this._builtTowers.clear();
        
        // 清空格子信息
        this._gridInfos = [];
        
        // 重置选中状态
        this._selectedGridIndex = -1;
        this._selectedTower = null;
    }
}

// 导出单例实例
export const towerSystem = TowerSystem.getInstance();