import { _decorator, Component, Node, Vec3, instantiate, Prefab } from 'cc';
import { GameState, GameStateType } from '../../Core/GameState';
const { ccclass, property } = _decorator;

/**
 * 道具类型枚举
 */
export enum ItemType {
    WEAPON = 0,         // 武器
    ARMOR = 1,          // 护甲
    ACCESSORY = 2,      // 饰品
    CONSUMABLE = 3,     // 消耗品
    MATERIAL = 4,       // 材料
    SPECIAL = 5,        // 特殊道具
}

/**
 * 道具稀有度枚举
 */
export enum ItemRarity {
    COMMON = 0,         // 普通
    UNCOMMON = 1,       // 不常见
    RARE = 2,           // 稀有
    EPIC = 3,           // 史诗
    LEGENDARY = 4,      // 传说
    MYTHIC = 5,         // 神话
}

/**
 * 道具属性接口
 */
export interface IItemStats {
    attack?: number;        // 攻击力
    defense?: number;       // 防御力
    health?: number;        // 生命值
    mana?: number;          // 法力值
    speed?: number;         // 速度
    luck?: number;          // 幸运值
    criticalChance?: number; // 暴击率
    criticalDamage?: number; // 暴击伤害
    cooldownReduction?: number; // 冷却缩减
    experienceBonus?: number;   // 经验加成
    goldBonus?: number;        // 金币加成
}

/**
 * 道具数据接口
 */
export interface IItemData {
    id: string;
    itemType: ItemType;
    rarity: ItemRarity;
    name: string;
    description: string;
    icon: string;
    stats: IItemStats;
    value: number;          // 道具价值
    stackable: boolean;     // 是否可堆叠
    stackCount: number;     // 堆叠数量
    maxStack: number;       // 最大堆叠数
    isEquipped: boolean;    // 是否已装备
    isConsumable: boolean;  // 是否可消耗
    effects: string[];      // 特殊效果
}

/**
 * 升级数据接口
 */
export interface IUpgradeData {
    id: string;
    name: string;
    description: string;
    cost: number;
    level: number;
    maxLevel: number;
    stats: IItemStats;
    requirements: string[]; // 升级需求
    isUnlocked: boolean;   // 是否已解锁
    isMaxLevel: boolean;   // 是否已满级
}

/**
 * 道具系统
 * 负责道具的生成、管理、装备、升级等逻辑
 */
@ccclass('ItemSystem')
export class ItemSystem extends Component {
    private static _instance: ItemSystem = null;
    
    @property(Node)
    public itemContainer: Node = null; // 道具容器节点
    
    @property([Prefab])
    public itemPrefabs: Prefab[] = []; // 道具预制体数组
    
    // 道具管理
    private _inventory: Map<string, IItemData> = new Map();
    private _equippedItems: Map<ItemType, IItemData> = new Map();
    private _itemTemplates: Map<string, IItemData> = new Map();
    
    // 升级管理
    private _upgrades: Map<string, IUpgradeData> = new Map();
    private _upgradePoints: number = 0;
    
    // 游戏状态
    private _isActive: boolean = false;
    private _maxInventorySize: number = 50;
    
    /**
     * 获取单例实例
     */
    public static getInstance(): ItemSystem {
        return ItemSystem._instance;
    }
    
    onLoad() {
        if (ItemSystem._instance === null) {
            ItemSystem._instance = this;
            this.initializeItemSystem();
        } else {
            this.node.destroy();
        }
    }
    
    /**
     * 初始化道具系统
     */
    private initializeItemSystem(): void {
        console.log("道具系统初始化");
        
        // 初始化道具模板
        this.initializeItemTemplates();
        
        // 初始化升级数据
        this.initializeUpgrades();
        
        // 注册游戏状态监听
        const gameState = GameState.getInstance();
        gameState.onStateEnter(GameStateType.ROGUELIKE, () => {
            this.startItemSystem();
        });
        
        gameState.onStateExit(GameStateType.ROGUELIKE, () => {
            this.stopItemSystem();
        });
    }
    
    /**
     * 初始化道具模板
     */
    private initializeItemTemplates(): void {
        // 武器模板
        this.addItemTemplate({
            id: "sword_basic",
            itemType: ItemType.WEAPON,
            rarity: ItemRarity.COMMON,
            name: "铁剑",
            description: "一把普通的铁制长剑",
            icon: "sword_icon",
            stats: { attack: 15 },
            value: 50,
            stackable: false,
            stackCount: 1,
            maxStack: 1,
            isEquipped: false,
            isConsumable: false,
            effects: []
        });
        
        this.addItemTemplate({
            id: "sword_rare",
            itemType: ItemType.WEAPON,
            rarity: ItemRarity.RARE,
            name: "魔法剑",
            description: "蕴含魔力的魔法剑",
            icon: "magic_sword_icon",
            stats: { attack: 25, criticalChance: 0.1 },
            value: 200,
            stackable: false,
            stackCount: 1,
            maxStack: 1,
            isEquipped: false,
            isConsumable: false,
            effects: ["magic_damage"]
        });
        
        // 护甲模板
        this.addItemTemplate({
            id: "armor_leather",
            itemType: ItemType.ARMOR,
            rarity: ItemRarity.COMMON,
            name: "皮甲",
            description: "轻便的皮制护甲",
            icon: "leather_armor_icon",
            stats: { defense: 5, health: 20 },
            value: 30,
            stackable: false,
            stackCount: 1,
            maxStack: 1,
            isEquipped: false,
            isConsumable: false,
            effects: []
        });
        
        this.addItemTemplate({
            id: "armor_plate",
            itemType: ItemType.ARMOR,
            rarity: ItemRarity.UNCOMMON,
            name: "板甲",
            description: "坚固的金属板甲",
            icon: "plate_armor_icon",
            stats: { defense: 12, health: 50, speed: -0.1 },
            value: 100,
            stackable: false,
            stackCount: 1,
            maxStack: 1,
            isEquipped: false,
            isConsumable: false,
            effects: []
        });
        
        // 饰品模板
        this.addItemTemplate({
            id: "ring_power",
            itemType: ItemType.ACCESSORY,
            rarity: ItemRarity.RARE,
            name: "力量之戒",
            description: "增加攻击力的魔法戒指",
            icon: "power_ring_icon",
            stats: { attack: 10, criticalDamage: 0.2 },
            value: 150,
            stackable: false,
            stackCount: 1,
            maxStack: 1,
            isEquipped: false,
            isConsumable: false,
            effects: ["strength_aura"]
        });
        
        // 消耗品模板
        this.addItemTemplate({
            id: "potion_health",
            itemType: ItemType.CONSUMABLE,
            rarity: ItemRarity.COMMON,
            name: "生命药水",
            description: "恢复50点生命值",
            icon: "health_potion_icon",
            stats: { health: 50 },
            value: 20,
            stackable: true,
            stackCount: 1,
            maxStack: 99,
            isEquipped: false,
            isConsumable: true,
            effects: ["heal"]
        });
        
        this.addItemTemplate({
            id: "potion_mana",
            itemType: ItemType.CONSUMABLE,
            rarity: ItemRarity.COMMON,
            name: "法力药水",
            description: "恢复30点法力值",
            icon: "mana_potion_icon",
            stats: { mana: 30 },
            value: 15,
            stackable: true,
            stackCount: 1,
            maxStack: 99,
            isEquipped: false,
            isConsumable: true,
            effects: ["mana_restore"]
        });
        
        console.log(`初始化了 ${this._itemTemplates.size} 个道具模板`);
    }
    
    /**
     * 初始化升级数据
     */
    private initializeUpgrades(): void {
        // 攻击力升级
        this.addUpgrade({
            id: "upgrade_attack",
            name: "攻击力强化",
            description: "永久增加5点攻击力",
            cost: 100,
            level: 0,
            maxLevel: 10,
            stats: { attack: 5 },
            requirements: [],
            isUnlocked: true,
            isMaxLevel: false
        });
        
        // 防御力升级
        this.addUpgrade({
            id: "upgrade_defense",
            name: "防御力强化",
            description: "永久增加3点防御力",
            cost: 80,
            level: 0,
            maxLevel: 10,
            stats: { defense: 3 },
            requirements: [],
            isUnlocked: true,
            isMaxLevel: false
        });
        
        // 生命值升级
        this.addUpgrade({
            id: "upgrade_health",
            name: "生命值强化",
            description: "永久增加20点最大生命值",
            cost: 120,
            level: 0,
            maxLevel: 10,
            stats: { health: 20 },
            requirements: [],
            isUnlocked: true,
            isMaxLevel: false
        });
        
        // 速度升级
        this.addUpgrade({
            id: "upgrade_speed",
            name: "速度强化",
            description: "永久增加0.1点移动速度",
            cost: 150,
            level: 0,
            maxLevel: 5,
            stats: { speed: 0.1 },
            requirements: [],
            isUnlocked: true,
            isMaxLevel: false
        });
        
        // 暴击率升级
        this.addUpgrade({
            id: "upgrade_critical",
            name: "暴击强化",
            description: "永久增加5%暴击率",
            cost: 200,
            level: 0,
            maxLevel: 5,
            stats: { criticalChance: 0.05 },
            requirements: ["upgrade_attack"],
            isUnlocked: false,
            isMaxLevel: false
        });
        
        console.log(`初始化了 ${this._upgrades.size} 个升级项`);
    }
    
    /**
     * 添加道具模板
     */
    private addItemTemplate(template: IItemData): void {
        this._itemTemplates.set(template.id, template);
    }
    
    /**
     * 添加升级项
     */
    private addUpgrade(upgrade: IUpgradeData): void {
        this._upgrades.set(upgrade.id, upgrade);
    }
    
    /**
     * 开始道具系统
     */
    public startItemSystem(): void {
        console.log("开始道具系统");
        this._isActive = true;
    }
    
    /**
     * 停止道具系统
     */
    public stopItemSystem(): void {
        console.log("停止道具系统");
        this._isActive = false;
    }
    
    /**
     * 创建道具
     */
    public createItem(templateId: string, count: number = 1): IItemData | null {
        const template = this._itemTemplates.get(templateId);
        if (!template) {
            console.error(`道具模板不存在: ${templateId}`);
            return null;
        }
        
        const item: IItemData = {
            ...template,
            id: this.generateItemId(),
            stackCount: Math.min(count, template.maxStack)
        };
        
        return item;
    }
    
    /**
     * 添加道具到背包
     */
    public addItemToInventory(item: IItemData): boolean {
        if (this._inventory.size >= this._maxInventorySize) {
            console.warn("背包已满，无法添加道具");
            return false;
        }
        
        // 如果是可堆叠道具，尝试合并
        if (item.stackable) {
            const existingItem = this.findStackableItem(item);
            if (existingItem) {
                const totalCount = existingItem.stackCount + item.stackCount;
                if (totalCount <= existingItem.maxStack) {
                    existingItem.stackCount = totalCount;
                    console.log(`道具堆叠: ${item.name} x${item.stackCount}`);
                    return true;
                }
            }
        }
        
        // 添加新道具
        this._inventory.set(item.id, item);
        console.log(`添加道具到背包: ${item.name}`);
        return true;
    }
    
    /**
     * 查找可堆叠的道具
     */
    private findStackableItem(item: IItemData): IItemData | null {
        for (const inventoryItem of this._inventory.values()) {
            if (inventoryItem.itemType === item.itemType && 
                inventoryItem.rarity === item.rarity &&
                inventoryItem.stackable &&
                inventoryItem.stackCount < inventoryItem.maxStack) {
                return inventoryItem;
            }
        }
        return null;
    }
    
    /**
     * 从背包移除道具
     */
    public removeItemFromInventory(itemId: string, count: number = 1): boolean {
        const item = this._inventory.get(itemId);
        if (!item) {
            console.error(`道具不存在: ${itemId}`);
            return false;
        }
        
        if (item.stackable) {
            if (item.stackCount <= count) {
                this._inventory.delete(itemId);
                console.log(`移除道具: ${item.name}`);
            } else {
                item.stackCount -= count;
                console.log(`减少道具数量: ${item.name} x${count}`);
            }
        } else {
            this._inventory.delete(itemId);
            console.log(`移除道具: ${item.name}`);
        }
        
        return true;
    }
    
    /**
     * 装备道具
     */
    public equipItem(itemId: string): boolean {
        const item = this._inventory.get(itemId);
        if (!item) {
            console.error(`道具不存在: ${itemId}`);
            return false;
        }
        
        if (item.itemType === ItemType.CONSUMABLE) {
            console.warn("消耗品无法装备");
            return false;
        }
        
        // 卸下同类型装备
        this.unequipItem(item.itemType);
        
        // 装备新道具
        item.isEquipped = true;
        this._equippedItems.set(item.itemType, item);
        
        console.log(`装备道具: ${item.name}`);
        return true;
    }
    
    /**
     * 卸下道具
     */
    public unequipItem(itemType: ItemType): boolean {
        const equippedItem = this._equippedItems.get(itemType);
        if (!equippedItem) {
            return false;
        }
        
        equippedItem.isEquipped = false;
        this._equippedItems.delete(itemType);
        
        console.log(`卸下道具: ${equippedItem.name}`);
        return true;
    }
    
    /**
     * 使用消耗品
     */
    public useConsumable(itemId: string): boolean {
        const item = this._inventory.get(itemId);
        if (!item) {
            console.error(`道具不存在: ${itemId}`);
            return false;
        }
        
        if (!item.isConsumable) {
            console.warn("该道具不是消耗品");
            return false;
        }
        
        // 应用道具效果
        this.applyItemEffects(item);
        
        // 减少数量或移除
        if (item.stackable && item.stackCount > 1) {
            item.stackCount--;
        } else {
            this._inventory.delete(itemId);
        }
        
        console.log(`使用消耗品: ${item.name}`);
        return true;
    }
    
    /**
     * 应用道具效果
     */
    private applyItemEffects(item: IItemData): void {
        console.log(`应用道具效果: ${item.name}`);
        // 这里应该通知游戏管理器应用道具效果
    }
    
    /**
     * 升级道具
     */
    public upgradeItem(itemId: string): boolean {
        const item = this._inventory.get(itemId);
        if (!item) {
            console.error(`道具不存在: ${itemId}`);
            return false;
        }
        
        // 这里实现道具升级逻辑
        console.log(`升级道具: ${item.name}`);
        return true;
    }
    
    /**
     * 购买升级
     */
    public purchaseUpgrade(upgradeId: string): boolean {
        const upgrade = this._upgrades.get(upgradeId);
        if (!upgrade) {
            console.error(`升级项不存在: ${upgradeId}`);
            return false;
        }
        
        if (!upgrade.isUnlocked) {
            console.warn("升级项未解锁");
            return false;
        }
        
        if (upgrade.isMaxLevel) {
            console.warn("升级项已满级");
            return false;
        }
        
        if (this._upgradePoints < upgrade.cost) {
            console.warn("升级点数不足");
            return false;
        }
        
        // 扣除升级点数
        this._upgradePoints -= upgrade.cost;
        
        // 升级
        upgrade.level++;
        upgrade.isMaxLevel = upgrade.level >= upgrade.maxLevel;
        
        console.log(`购买升级: ${upgrade.name} (等级 ${upgrade.level})`);
        return true;
    }
    
    /**
     * 解锁升级
     */
    public unlockUpgrade(upgradeId: string): boolean {
        const upgrade = this._upgrades.get(upgradeId);
        if (!upgrade) {
            console.error(`升级项不存在: ${upgradeId}`);
            return false;
        }
        
        // 检查需求是否满足
        for (const requirement of upgrade.requirements) {
            const reqUpgrade = this._upgrades.get(requirement);
            if (!reqUpgrade || !reqUpgrade.isMaxLevel) {
                console.warn(`升级需求未满足: ${requirement}`);
                return false;
            }
        }
        
        upgrade.isUnlocked = true;
        console.log(`解锁升级: ${upgrade.name}`);
        return true;
    }
    
    /**
     * 添加升级点数
     */
    public addUpgradePoints(points: number): void {
        this._upgradePoints += points;
        console.log(`获得升级点数: ${points}，当前点数: ${this._upgradePoints}`);
    }
    
    /**
     * 生成道具ID
     */
    private generateItemId(): string {
        return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 获取背包道具
     */
    public getInventoryItems(): IItemData[] {
        return Array.from(this._inventory.values());
    }
    
    /**
     * 获取已装备道具
     */
    public getEquippedItems(): IItemData[] {
        return Array.from(this._equippedItems.values());
    }
    
    /**
     * 获取升级项
     */
    public getUpgrades(): IUpgradeData[] {
        return Array.from(this._upgrades.values());
    }
    
    /**
     * 获取可用的升级项
     */
    public getAvailableUpgrades(): IUpgradeData[] {
        return Array.from(this._upgrades.values()).filter(upgrade => 
            upgrade.isUnlocked && !upgrade.isMaxLevel
        );
    }
    
    /**
     * 获取升级点数
     */
    public getUpgradePoints(): number {
        return this._upgradePoints;
    }
    
    /**
     * 获取背包剩余空间
     */
    public getInventorySpace(): number {
        return this._maxInventorySize - this._inventory.size;
    }
    
    /**
     * 检查背包是否已满
     */
    public isInventoryFull(): boolean {
        return this._inventory.size >= this._maxInventorySize;
    }
    
    /**
     * 清空背包
     */
    public clearInventory(): void {
        this._inventory.clear();
        this._equippedItems.clear();
        console.log("清空背包");
    }
    
    /**
     * 检查是否激活
     */
    public isActive(): boolean {
        return this._isActive;
    }
    
    onDestroy() {
        if (ItemSystem._instance === this) {
            ItemSystem._instance = null;
        }
    }
}
