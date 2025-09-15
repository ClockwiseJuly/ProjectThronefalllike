import { _decorator, Component, Node } from 'cc';
import { GameManager } from '../Core/GameManager';
import { GameState, GameStateType } from '../Core/GameState';
import { UIManager, UIType } from '../UI/UIManager';
import { AudioManager } from '../Audio/AudioManager';
import { SaveSystem, SaveType } from '../Core/SaveSystem';
import { TowerDefenseSystem, TowerType } from '../Gameplay/TowerDefense/TowerDefenseSystem';
import { RoguelikeSystem } from '../Gameplay/Roguelike/RoguelikeSystem';
import { ItemSystem } from '../Gameplay/Item/ItemSystem';
import { EnemySystem, EnemyType } from '../Gameplay/Enemy/EnemySystem';
const { ccclass, property } = _decorator;

/**
 * 游戏示例类
 * 展示如何使用游戏框架的各个系统
 */
@ccclass('GameExample')
export class GameExample extends Component {
    
    onLoad() {
        console.log("游戏示例初始化");
        this.setupGameExample();
    }
    
    /**
     * 设置游戏示例
     */
    private setupGameExample(): void {
        // 等待游戏管理器初始化完成
        this.scheduleOnce(() => {
            this.demonstrateGameSystems();
        }, 1.0);
    }
    
    /**
     * 演示游戏系统
     */
    private demonstrateGameSystems(): void {
        console.log("=== 游戏系统演示开始 ===");
        
        // 1. 演示游戏状态管理
        this.demonstrateGameState();
        
        // 2. 演示UI管理
        this.demonstrateUIManagement();
        
        // 3. 演示音频管理
        this.demonstrateAudioManagement();
        
        // 4. 演示存档系统
        this.demonstrateSaveSystem();
        
        // 5. 演示塔防系统
        this.demonstrateTowerDefenseSystem();
        
        // 6. 演示肉鸽系统
        this.demonstrateRoguelikeSystem();
        
        // 7. 演示道具系统
        this.demonstrateItemSystem();
        
        // 8. 演示敌人系统
        this.demonstrateEnemySystem();
        
        console.log("=== 游戏系统演示完成 ===");
    }
    
    /**
     * 演示游戏状态管理
     */
    private demonstrateGameState(): void {
        console.log("--- 游戏状态管理演示 ---");
        
        const gameState = GameState.getInstance();
        
        // 显示当前状态
        console.log(`当前游戏状态: ${GameStateType[gameState.getCurrentState()]}`);
        console.log(`当前游戏模式: ${gameState.getGameMode()}`);
        console.log(`当前天数: ${gameState.getDayCount()}`);
        console.log(`当前夜数: ${gameState.getNightCount()}`);
        
        // 注册状态变化监听
        gameState.onStateChange(GameStateType.TOWER_DEFENSE, (newState, oldState) => {
            console.log(`状态变化: ${GameStateType[oldState]} -> ${GameStateType[newState]}`);
        });
        
        // 切换状态（示例）
        // gameState.changeState(GameStateType.TOWER_DEFENSE);
    }
    
    /**
     * 演示UI管理
     */
    private demonstrateUIManagement(): void {
        console.log("--- UI管理演示 ---");
        
        const uiManager = UIManager.getInstance();
        
        // 显示主菜单
        uiManager.showUI(UIType.MAIN_MENU);
        
        // 显示通知
        uiManager.showNotification("欢迎来到游戏！", 3.0);
        
        // 检查UI是否显示
        console.log(`主菜单是否显示: ${uiManager.isUIVisible(UIType.MAIN_MENU)}`);
        
        // 获取UI栈
        console.log(`当前UI栈: ${uiManager.getUIStack()}`);
    }
    
    /**
     * 演示音频管理
     */
    private demonstrateAudioManagement(): void {
        console.log("--- 音频管理演示 ---");
        
        const audioManager = AudioManager.getInstance();
        
        // 设置音量
        audioManager.setMasterVolume(0.8);
        audioManager.setBGMVolume(0.7);
        audioManager.setSFXVolume(0.9);
        
        // 播放背景音乐
        audioManager.playBGM("bgm_main_menu");
        
        // 播放音效
        audioManager.playSFX("sfx_button_click");
        
        // 显示音频状态
        console.log(`主音量: ${audioManager.getMasterVolume()}`);
        console.log(`BGM音量: ${audioManager.getBGMVolume()}`);
        console.log(`音效音量: ${audioManager.getSFXVolume()}`);
        console.log(`是否静音: ${audioManager.isMuted()}`);
    }
    
    /**
     * 演示存档系统
     */
    private demonstrateSaveSystem(): void {
        console.log("--- 存档系统演示 ---");
        
        const saveSystem = SaveSystem.getInstance();
        
        // 创建新存档
        const newSave = saveSystem.createNewSave();
        console.log("创建新存档:", newSave);
        
        // 保存游戏
        const saveResult = saveSystem.saveGame(SaveType.MANUAL);
        console.log(`保存游戏结果: ${saveResult}`);
        
        // 检查存档是否存在
        console.log(`手动存档是否存在: ${saveSystem.hasSave(SaveType.MANUAL)}`);
        
        // 获取存档列表
        const saveList = saveSystem.getSaveList();
        console.log(`存档列表: ${saveList.length} 个存档`);
    }
    
    /**
     * 演示塔防系统
     */
    private demonstrateTowerDefenseSystem(): void {
        console.log("--- 塔防系统演示 ---");
        
        const towerSystem = TowerDefenseSystem.getInstance();
        
        if (towerSystem) {
            // 显示塔防系统状态
            console.log(`塔防系统是否激活: ${towerSystem.isActive()}`);
            console.log(`当前金币: ${towerSystem.getGold()}`);
            console.log(`当前生命值: ${towerSystem.getLives()}`);
            console.log(`当前分数: ${towerSystem.getScore()}`);
            console.log(`当前波次: ${towerSystem.getCurrentWave()}/${towerSystem.getTotalWaves()}`);
            
            // 建造塔（示例）
            // towerSystem.buildTower(TowerType.ARROW_TOWER, new Vec3(0, 0, 0));
        }
    }
    
    /**
     * 演示肉鸽系统
     */
    private demonstrateRoguelikeSystem(): void {
        console.log("--- 肉鸽系统演示 ---");
        
        const roguelikeSystem = RoguelikeSystem.getInstance();
        
        if (roguelikeSystem) {
            // 显示肉鸽系统状态
            console.log(`肉鸽系统是否激活: ${roguelikeSystem.isActive()}`);
            
            // 获取玩家状态
            const playerStats = roguelikeSystem.getPlayerStats();
            console.log("玩家状态:", playerStats);
            
            // 获取当前地图
            const currentMap = roguelikeSystem.getCurrentMap();
            if (currentMap) {
                console.log(`当前地图: ${currentMap.mapName}`);
                console.log(`当前楼层: ${currentMap.floor}`);
                console.log(`房间数量: ${currentMap.rooms.length}`);
            }
            
            // 获取背包
            const inventory = roguelikeSystem.getInventory();
            console.log(`背包道具数量: ${inventory.length}`);
        }
    }
    
    /**
     * 演示道具系统
     */
    private demonstrateItemSystem(): void {
        console.log("--- 道具系统演示 ---");
        
        const itemSystem = ItemSystem.getInstance();
        
        if (itemSystem) {
            // 显示道具系统状态
            console.log(`道具系统是否激活: ${itemSystem.isActive()}`);
            console.log(`升级点数: ${itemSystem.getUpgradePoints()}`);
            console.log(`背包剩余空间: ${itemSystem.getInventorySpace()}`);
            console.log(`背包是否已满: ${itemSystem.isInventoryFull()}`);
            
            // 获取背包道具
            const inventory = itemSystem.getInventoryItems();
            console.log(`背包道具数量: ${inventory.length}`);
            
            // 获取已装备道具
            const equipped = itemSystem.getEquippedItems();
            console.log(`已装备道具数量: ${equipped.length}`);
            
            // 获取升级项
            const upgrades = itemSystem.getUpgrades();
            console.log(`升级项数量: ${upgrades.length}`);
        }
    }
    
    /**
     * 演示敌人系统
     */
    private demonstrateEnemySystem(): void {
        console.log("--- 敌人系统演示 ---");
        
        const enemySystem = EnemySystem.getInstance();
        
        if (enemySystem) {
            // 显示敌人系统状态
            console.log(`敌人系统是否激活: ${enemySystem.isActive()}`);
            console.log(`总生成敌人数量: ${enemySystem.getTotalEnemiesSpawned()}`);
            console.log(`总杀死敌人数量: ${enemySystem.getTotalEnemiesKilled()}`);
            
            // 获取所有敌人
            const allEnemies = enemySystem.getAllEnemies();
            console.log(`当前敌人数量: ${allEnemies.length}`);
            
            // 获取活跃敌人
            const activeEnemies = enemySystem.getActiveEnemies();
            console.log(`活跃敌人数量: ${activeEnemies.length}`);
            
            // 生成敌人（示例）
            // enemySystem.spawnEnemy(EnemyType.BASIC);
        }
    }
    
    /**
     * 演示游戏循环
     */
    private demonstrateGameLoop(): void {
        console.log("--- 游戏循环演示 ---");
        
        const gameManager = GameManager.getInstance();
        
        if (gameManager) {
            console.log(`游戏是否已初始化: ${gameManager.isInitialized()}`);
            console.log(`游戏是否已暂停: ${gameManager.isPaused()}`);
            console.log(`游戏时间: ${gameManager.getGameTime()}`);
            
            // 暂停游戏
            // gameManager.pauseGame();
            
            // 恢复游戏
            // gameManager.resumeGame();
        }
    }
    
    /**
     * 演示系统集成
     */
    private demonstrateSystemIntegration(): void {
        console.log("--- 系统集成演示 ---");
        
        // 模拟游戏流程
        this.scheduleOnce(() => {
            console.log("开始游戏流程演示...");
            
            // 1. 切换到塔防模式
            const gameState = GameState.getInstance();
            gameState.changeState(GameStateType.TOWER_DEFENSE);
            
            // 2. 显示塔防UI
            const uiManager = UIManager.getInstance();
            uiManager.showUI(UIType.TOWER_DEFENSE_HUD);
            
            // 3. 播放塔防背景音乐
            const audioManager = AudioManager.getInstance();
            audioManager.playBGM("bgm_tower_defense");
            
            // 4. 生成敌人
            const enemySystem = EnemySystem.getInstance();
            if (enemySystem) {
                enemySystem.spawnEnemy(EnemyType.BASIC);
            }
            
            console.log("游戏流程演示完成");
        }, 2.0);
    }
    
    /**
     * 演示错误处理
     */
    private demonstrateErrorHandling(): void {
        console.log("--- 错误处理演示 ---");
        
        try {
            // 尝试访问不存在的系统
            const nonExistentSystem = null;
            if (nonExistentSystem) {
                console.log("这行代码不会执行");
            }
            
            // 尝试调用可能失败的方法
            const saveSystem = SaveSystem.getInstance();
            const loadResult = saveSystem.loadGame(SaveType.MANUAL);
            console.log(`加载游戏结果: ${loadResult}`);
            
        } catch (error) {
            console.error("捕获到错误:", error);
        }
    }
    
    /**
     * 演示性能监控
     */
    private demonstratePerformanceMonitoring(): void {
        console.log("--- 性能监控演示 ---");
        
        // 监控内存使用
        const memoryInfo = (performance as any).memory;
        if (memoryInfo) {
            console.log(`已使用内存: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`总内存: ${(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
        }
        
        // 监控帧率
        let frameCount = 0;
        let lastTime = Date.now();
        
        const monitorFrameRate = () => {
            frameCount++;
            const currentTime = Date.now();
            if (currentTime - lastTime >= 1000) {
                console.log(`当前帧率: ${frameCount} FPS`);
                frameCount = 0;
                lastTime = currentTime;
            }
        };
        
        this.schedule(monitorFrameRate, 0.016); // 约60FPS
    }
    
    onDestroy() {
        console.log("游戏示例销毁");
    }
}