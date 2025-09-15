import { _decorator, Component, Node, Vec3, instantiate, Prefab } from 'cc';
import { GameState, GameStateType } from '../../Core/GameState';
const { ccclass, property } = _decorator;

/**
 * 肉鸽房间类型枚举
 */
export enum RoomType {
    COMBAT = 0,         // 战斗房间
    TREASURE = 1,       // 宝箱房间
    SHOP = 2,           // 商店房间
    REST = 3,           // 休息房间
    BOSS = 4,           // Boss房间
    EVENT = 5,          // 事件房间
    ELITE = 6,          // 精英房间
}

/**
 * 难度等级枚举
 */
export enum DifficultyLevel {
    EASY = 1,
    NORMAL = 2,
    HARD = 3,
    NIGHTMARE = 4,
    HELL = 5,
}

/**
 * 玩家状态接口
 */
export interface IPlayerStats {
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    attack: number;
    defense: number;
    speed: number;
    luck: number;
    experience: number;
    level: number;
}

/**
 * 房间数据接口
 */
export interface IRoomData {
    id: string;
    roomType: RoomType;
    position: Vec3;
    isVisited: boolean;
    isCompleted: boolean;
    difficulty: DifficultyLevel;
    enemies?: string[];
    rewards?: string[];
    shopItems?: string[];
    events?: string[];
}

/**
 * 地图数据接口
 */
export interface IMapData {
    mapId: string;
    mapName: string;
    floor: number;
    maxFloor: number;
    rooms: IRoomData[];
    currentRoomId: string;
    isCompleted: boolean;
}

/**
 * 肉鸽系统
 * 负责肉鸽模式的所有逻辑，包括房间生成、战斗、道具获取等
 */
@ccclass('RoguelikeSystem')
export class RoguelikeSystem extends Component {
    private static _instance: RoguelikeSystem = null;
    
    @property(Node)
    public playerNode: Node = null; // 玩家节点
    
    @property(Node)
    public roomContainer: Node = null; // 房间容器节点
    
    @property(Node)
    public enemyContainer: Node = null; // 敌人容器节点
    
    @property([Prefab])
    public roomPrefabs: Prefab[] = []; // 房间预制体数组
    
    @property([Prefab])
    public enemyPrefabs: Prefab[] = []; // 敌人预制体数组
    
    @property([Prefab])
    public itemPrefabs: Prefab[] = []; // 道具预制体数组
    
    // 游戏状态
    private _isActive: boolean = false;
    private _currentMap: IMapData = null;
    private _playerStats: IPlayerStats = null;
    private _inventory: string[] = [];
    private _currentRoom: IRoomData = null;
    private _gameTime: number = 0;
    private _score: number = 0;
    
    // 房间生成参数
    private _roomCount: number = 8; // 每层房间数量
    private _bossRoomInterval: number = 5; // Boss房间间隔
    private _eliteRoomChance: number = 0.2; // 精英房间概率
    
    // 难度曲线
    private _difficultyMultiplier: number = 1.0;
    private _floorDifficultyIncrease: number = 0.2;
    
    /**
     * 获取单例实例
     */
    public static getInstance(): RoguelikeSystem {
        return RoguelikeSystem._instance;
    }
    
    onLoad() {
        if (RoguelikeSystem._instance === null) {
            RoguelikeSystem._instance = this;
            this.initializeRoguelike();
        } else {
            this.node.destroy();
        }
    }
    
    /**
     * 初始化肉鸽系统
     */
    private initializeRoguelike(): void {
        console.log("肉鸽系统初始化");
        
        // 初始化玩家状态
        this.initializePlayerStats();
        
        // 注册游戏状态监听
        const gameState = GameState.getInstance();
        gameState.onStateEnter(GameStateType.ROGUELIKE, () => {
            this.startRoguelike();
        });
        
        gameState.onStateExit(GameStateType.ROGUELIKE, () => {
            this.stopRoguelike();
        });
    }
    
    /**
     * 初始化玩家状态
     */
    private initializePlayerStats(): void {
        this._playerStats = {
            health: 100,
            maxHealth: 100,
            mana: 50,
            maxMana: 50,
            attack: 20,
            defense: 5,
            speed: 1.0,
            luck: 1.0,
            experience: 0,
            level: 1
        };
        
        console.log("玩家状态初始化完成");
    }
    
    /**
     * 开始肉鸽模式
     */
    public startRoguelike(): void {
        console.log("开始肉鸽模式");
        this._isActive = true;
        this._gameTime = 0;
        this._score = 0;
        this._inventory = [];
        
        // 生成新地图
        this.generateNewMap();
        
        // 进入第一个房间
        this.enterFirstRoom();
    }
    
    /**
     * 停止肉鸽模式
     */
    public stopRoguelike(): void {
        console.log("停止肉鸽模式");
        this._isActive = false;
        this.clearCurrentMap();
    }
    
    /**
     * 生成新地图
     */
    private generateNewMap(): void {
        const mapId = this.generateMapId();
        const mapName = `地下城第${this._playerStats.level}层`;
        
        this._currentMap = {
            mapId: mapId,
            mapName: mapName,
            floor: this._playerStats.level,
            maxFloor: this._playerStats.level + 10,
            rooms: [],
            currentRoomId: "",
            isCompleted: false
        };
        
        // 生成房间
        this.generateRooms();
        
        console.log(`生成新地图: ${mapName}`);
    }
    
    /**
     * 生成房间
     */
    private generateRooms(): void {
        const rooms: IRoomData[] = [];
        
        // 生成起始房间（休息房间）
        const startRoom: IRoomData = {
            id: this.generateRoomId(),
            roomType: RoomType.REST,
            position: new Vec3(0, 0, 0),
            isVisited: false,
            isCompleted: false,
            difficulty: DifficultyLevel.EASY
        };
        rooms.push(startRoom);
        
        // 生成其他房间
        for (let i = 1; i < this._roomCount; i++) {
            const roomType = this.determineRoomType(i);
            const difficulty = this.calculateRoomDifficulty(i);
            
            const room: IRoomData = {
                id: this.generateRoomId(),
                roomType: roomType,
                position: this.calculateRoomPosition(i),
                isVisited: false,
                isCompleted: false,
                difficulty: difficulty
            };
            
            // 根据房间类型设置特殊属性
            this.configureRoomByType(room);
            
            rooms.push(room);
        }
        
        this._currentMap.rooms = rooms;
        console.log(`生成了 ${rooms.length} 个房间`);
    }
    
    /**
     * 确定房间类型
     */
    private determineRoomType(roomIndex: number): RoomType {
        // Boss房间
        if (roomIndex === this._roomCount - 1) {
            return RoomType.BOSS;
        }
        
        // 精英房间
        if (roomIndex % this._bossRoomInterval === 0 && Math.random() < this._eliteRoomChance) {
            return RoomType.ELITE;
        }
        
        // 随机选择房间类型
        const roomTypes = [RoomType.COMBAT, RoomType.TREASURE, RoomType.SHOP, RoomType.EVENT];
        const weights = [0.5, 0.2, 0.15, 0.15]; // 战斗房间概率最高
        
        return this.weightedRandomSelect(roomTypes, weights);
    }
    
    /**
     * 计算房间难度
     */
    private calculateRoomDifficulty(roomIndex: number): DifficultyLevel {
        const baseDifficulty = Math.floor(roomIndex / 2) + 1;
        const randomFactor = Math.random() < 0.3 ? 1 : 0; // 30%概率增加难度
        
        const difficulty = Math.min(baseDifficulty + randomFactor, DifficultyLevel.HELL);
        return difficulty;
    }
    
    /**
     * 计算房间位置
     */
    private calculateRoomPosition(roomIndex: number): Vec3 {
        // 简单的线性排列，实际游戏中可以使用更复杂的布局
        const x = (roomIndex - 1) * 10;
        const y = 0;
        const z = 0;
        return new Vec3(x, y, z);
    }
    
    /**
     * 根据房间类型配置房间
     */
    private configureRoomByType(room: IRoomData): void {
        switch (room.roomType) {
            case RoomType.COMBAT:
                room.enemies = this.generateEnemiesForRoom(room.difficulty);
                break;
            case RoomType.TREASURE:
                room.rewards = this.generateRewardsForRoom(room.difficulty);
                break;
            case RoomType.SHOP:
                room.shopItems = this.generateShopItemsForRoom(room.difficulty);
                break;
            case RoomType.EVENT:
                room.events = this.generateEventsForRoom(room.difficulty);
                break;
            case RoomType.ELITE:
                room.enemies = this.generateEliteEnemiesForRoom(room.difficulty);
                break;
            case RoomType.BOSS:
                room.enemies = this.generateBossEnemiesForRoom(room.difficulty);
                break;
        }
    }
    
    /**
     * 生成房间敌人
     */
    private generateEnemiesForRoom(difficulty: DifficultyLevel): string[] {
        const enemyTypes = ["Goblin", "Skeleton", "Orc", "DarkMage"];
        const enemyCount = Math.floor(difficulty * 2 + Math.random() * 2);
        const enemies: string[] = [];
        
        for (let i = 0; i < enemyCount; i++) {
            const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            enemies.push(enemyType);
        }
        
        return enemies;
    }
    
    /**
     * 生成精英敌人
     */
    private generateEliteEnemiesForRoom(difficulty: DifficultyLevel): string[] {
        const eliteEnemies = ["EliteGoblin", "EliteSkeleton", "EliteOrc", "EliteDarkMage"];
        const enemyCount = Math.floor(difficulty * 1.5);
        const enemies: string[] = [];
        
        for (let i = 0; i < enemyCount; i++) {
            const enemyType = eliteEnemies[Math.floor(Math.random() * eliteEnemies.length)];
            enemies.push(enemyType);
        }
        
        return enemies;
    }
    
    /**
     * 生成Boss敌人
     */
    private generateBossEnemiesForRoom(difficulty: DifficultyLevel): string[] {
        const bossEnemies = ["Dragon", "Lich", "DemonLord", "AncientGuardian"];
        const bossType = bossEnemies[Math.floor(Math.random() * bossEnemies.length)];
        return [bossType];
    }
    
    /**
     * 生成房间奖励
     */
    private generateRewardsForRoom(difficulty: DifficultyLevel): string[] {
        const rewards = ["HealthPotion", "ManaPotion", "AttackBoost", "DefenseBoost", "SpeedBoost"];
        const rewardCount = Math.floor(difficulty * 0.5 + 1);
        const roomRewards: string[] = [];
        
        for (let i = 0; i < rewardCount; i++) {
            const reward = rewards[Math.floor(Math.random() * rewards.length)];
            roomRewards.push(reward);
        }
        
        return roomRewards;
    }
    
    /**
     * 生成商店物品
     */
    private generateShopItemsForRoom(difficulty: DifficultyLevel): string[] {
        const shopItems = ["Sword", "Shield", "Armor", "Ring", "Potion"];
        const itemCount = Math.floor(difficulty * 0.3 + 3);
        const items: string[] = [];
        
        for (let i = 0; i < itemCount; i++) {
            const item = shopItems[Math.floor(Math.random() * shopItems.length)];
            items.push(item);
        }
        
        return items;
    }
    
    /**
     * 生成房间事件
     */
    private generateEventsForRoom(difficulty: DifficultyLevel): string[] {
        const events = ["MysteriousAltar", "AncientTomb", "CursedShrine", "FountainOfLife"];
        const eventCount = 1;
        const roomEvents: string[] = [];
        
        for (let i = 0; i < eventCount; i++) {
            const event = events[Math.floor(Math.random() * events.length)];
            roomEvents.push(event);
        }
        
        return roomEvents;
    }
    
    /**
     * 进入第一个房间
     */
    private enterFirstRoom(): void {
        if (this._currentMap.rooms.length === 0) {
            console.error("没有可进入的房间");
            return;
        }
        
        const firstRoom = this._currentMap.rooms[0];
        this.enterRoom(firstRoom.id);
    }
    
    /**
     * 进入房间
     */
    public enterRoom(roomId: string): boolean {
        const room = this._currentMap.rooms.find(r => r.id === roomId);
        if (!room) {
            console.error(`房间不存在: ${roomId}`);
            return false;
        }
        
        console.log(`进入房间: ${RoomType[room.roomType]} (${roomId})`);
        
        this._currentRoom = room;
        this._currentMap.currentRoomId = roomId;
        room.isVisited = true;
        
        // 根据房间类型执行相应逻辑
        this.handleRoomEntry(room);
        
        return true;
    }
    
    /**
     * 处理房间进入逻辑
     */
    private handleRoomEntry(room: IRoomData): void {
        switch (room.roomType) {
            case RoomType.COMBAT:
                this.startCombat(room);
                break;
            case RoomType.TREASURE:
                this.openTreasure(room);
                break;
            case RoomType.SHOP:
                this.openShop(room);
                break;
            case RoomType.REST:
                this.rest(room);
                break;
            case RoomType.EVENT:
                this.triggerEvent(room);
                break;
            case RoomType.ELITE:
                this.startEliteCombat(room);
                break;
            case RoomType.BOSS:
                this.startBossCombat(room);
                break;
        }
    }
    
    /**
     * 开始战斗
     */
    private startCombat(room: IRoomData): void {
        console.log("开始战斗");
        // 这里实现战斗逻辑
        this.spawnEnemies(room.enemies || []);
    }
    
    /**
     * 开始精英战斗
     */
    private startEliteCombat(room: IRoomData): void {
        console.log("开始精英战斗");
        this.spawnEnemies(room.enemies || []);
    }
    
    /**
     * 开始Boss战斗
     */
    private startBossCombat(room: IRoomData): void {
        console.log("开始Boss战斗");
        this.spawnEnemies(room.enemies || []);
    }
    
    /**
     * 生成敌人
     */
    private spawnEnemies(enemyTypes: string[]): void {
        for (const enemyType of enemyTypes) {
            console.log(`生成敌人: ${enemyType}`);
            // 这里实现敌人生成逻辑
        }
    }
    
    /**
     * 打开宝箱
     */
    private openTreasure(room: IRoomData): void {
        console.log("打开宝箱");
        const rewards = room.rewards || [];
        for (const reward of rewards) {
            this.giveReward(reward);
        }
        room.isCompleted = true;
    }
    
    /**
     * 打开商店
     */
    private openShop(room: IRoomData): void {
        console.log("打开商店");
        // 这里实现商店逻辑
        room.isCompleted = true;
    }
    
    /**
     * 休息
     */
    private rest(room: IRoomData): void {
        console.log("休息恢复");
        this._playerStats.health = this._playerStats.maxHealth;
        this._playerStats.mana = this._playerStats.maxMana;
        room.isCompleted = true;
    }
    
    /**
     * 触发事件
     */
    private triggerEvent(room: IRoomData): void {
        console.log("触发事件");
        const events = room.events || [];
        for (const event of events) {
            this.handleEvent(event);
        }
        room.isCompleted = true;
    }
    
    /**
     * 处理事件
     */
    private handleEvent(eventType: string): void {
        console.log(`处理事件: ${eventType}`);
        // 这里实现各种事件的逻辑
    }
    
    /**
     * 给予奖励
     */
    private giveReward(rewardType: string): void {
        console.log(`获得奖励: ${rewardType}`);
        this._inventory.push(rewardType);
        // 这里实现奖励效果
    }
    
    /**
     * 完成房间
     */
    public completeRoom(): void {
        if (!this._currentRoom) return;
        
        this._currentRoom.isCompleted = true;
        console.log(`房间完成: ${this._currentRoom.id}`);
        
        // 检查是否完成整个地图
        this.checkMapCompletion();
    }
    
    /**
     * 检查地图完成
     */
    private checkMapCompletion(): void {
        const allRoomsCompleted = this._currentMap.rooms.every(room => room.isCompleted);
        if (allRoomsCompleted) {
            this.completeMap();
        }
    }
    
    /**
     * 完成地图
     */
    private completeMap(): void {
        console.log("地图完成！");
        this._currentMap.isCompleted = true;
        
        // 增加玩家等级
        this._playerStats.level++;
        this._playerStats.experience += 100;
        
        // 生成下一层地图
        this.generateNewMap();
    }
    
    /**
     * 清理当前地图
     */
    private clearCurrentMap(): void {
        this._currentMap = null;
        this._currentRoom = null;
        console.log("清理当前地图");
    }
    
    /**
     * 加权随机选择
     */
    private weightedRandomSelect<T>(items: T[], weights: number[]): T {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }
        
        return items[items.length - 1];
    }
    
    /**
     * 生成地图ID
     */
    private generateMapId(): string {
        return `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 生成房间ID
     */
    private generateRoomId(): string {
        return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 获取玩家状态
     */
    public getPlayerStats(): IPlayerStats {
        return { ...this._playerStats };
    }
    
    /**
     * 获取当前地图
     */
    public getCurrentMap(): IMapData | null {
        return this._currentMap;
    }
    
    /**
     * 获取当前房间
     */
    public getCurrentRoom(): IRoomData | null {
        return this._currentRoom;
    }
    
    /**
     * 获取背包
     */
    public getInventory(): string[] {
        return [...this._inventory];
    }
    
    /**
     * 获取分数
     */
    public getScore(): number {
        return this._score;
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
        
        // 更新战斗逻辑
        this.updateCombat(deltaTime);
    }
    
    /**
     * 更新战斗逻辑
     */
    private updateCombat(deltaTime: number): void {
        // 这里实现战斗更新逻辑
    }
    
    onDestroy() {
        if (RoguelikeSystem._instance === this) {
            RoguelikeSystem._instance = null;
        }
    }
}
