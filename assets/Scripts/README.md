# 王权陨落类游戏框架

这是一个基于Cocos Creator 3.8.7开发的类似《王权陨落》的游戏框架，结合了塔防、肉鸽和策略元素。

## 项目结构

```
assets/scripts/
├── Core/                    # 核心系统
│   ├── GameManager.ts      # 游戏主管理器
│   ├── GameState.ts        # 游戏状态管理
│   ├── SceneManager.ts     # 场景管理
│   └── SaveSystem.ts       # 数据持久化
├── Gameplay/               # 游戏玩法系统
│   ├── TowerDefense/       # 塔防系统
│   │   └── TowerDefenseSystem.ts
│   ├── Roguelike/          # 肉鸽系统
│   │   └── RoguelikeSystem.ts
│   ├── Enemy/              # 敌人系统
│   │   └── EnemySystem.ts
│   └── Item/               # 道具系统
│       └── ItemSystem.ts
├── UI/                     # UI系统
│   └── UIManager.ts        # UI管理器
├── Audio/                  # 音频系统
│   └── AudioManager.ts     # 音频管理器
└── README.md              # 说明文档
```

## 核心系统说明

### 1. GameManager (游戏主管理器)
- 负责整个游戏的生命周期管理
- 协调各个系统之间的交互
- 采用单例模式，确保全局唯一性

### 2. GameState (游戏状态系统)
- 管理游戏的各种状态（主菜单、塔防、肉鸽等）
- 提供状态转换和回调机制
- 支持状态持久化

### 3. SceneManager (场景管理器)
- 负责场景的加载、切换和预加载
- 支持场景缓存和资源管理
- 提供场景转换动画

### 4. SaveSystem (数据持久化系统)
- 支持多种存档类型（自动、手动、快速、云存档）
- 版本兼容性检查
- 设置和统计数据保存

## 游戏玩法系统

### 1. TowerDefenseSystem (塔防系统)
- 塔的建造、升级、出售
- 波次管理和敌人生成
- 路径点和攻击逻辑

### 2. RoguelikeSystem (肉鸽系统)
- 房间生成和地图管理
- 玩家状态和成长系统
- 随机事件和奖励

### 3. EnemySystem (敌人系统)
- 多种敌人类型和AI
- 状态效果和路径跟随
- 攻击和死亡逻辑

### 4. ItemSystem (道具系统)
- 道具生成和管理
- 装备和背包系统
- 升级和强化

## UI系统

### UIManager (UI管理器)
- 分层UI管理
- 模态UI支持
- 动画和过渡效果

## 音频系统

### AudioManager (音频管理器)
- 多类型音频支持（BGM、音效、语音、环境音）
- 音量控制和淡入淡出
- 音频实例管理

## 使用说明

### 1. 初始化游戏
```typescript
// 在场景中创建GameManager节点并挂载GameManager组件
// 系统会自动初始化所有子系统
```

### 2. 切换游戏状态
```typescript
const gameState = GameState.getInstance();
gameState.changeState(GameStateType.TOWER_DEFENSE);
```

### 3. 显示UI
```typescript
const uiManager = UIManager.getInstance();
uiManager.showUI(UIType.MAIN_MENU);
```

### 4. 播放音频
```typescript
const audioManager = AudioManager.getInstance();
audioManager.playBGM("bgm_main_menu");
audioManager.playSFX("sfx_button_click");
```

### 5. 保存游戏
```typescript
const saveSystem = SaveSystem.getInstance();
saveSystem.saveGame(SaveType.MANUAL);
```

## 扩展指南

### 1. 添加新的游戏状态
1. 在`GameState.ts`中添加新的状态枚举
2. 在`SceneManager.ts`中添加对应的场景处理
3. 在`UIManager.ts`中添加对应的UI处理

### 2. 添加新的敌人类型
1. 在`EnemySystem.ts`中添加新的敌人类型枚举
2. 在`initializeEnemyStats`方法中添加敌人属性
3. 创建对应的敌人预制体

### 3. 添加新的道具类型
1. 在`ItemSystem.ts`中添加新的道具类型枚举
2. 在`initializeItemTemplates`方法中添加道具模板
3. 实现道具的特殊效果

### 4. 添加新的UI界面
1. 在`UIManager.ts`中添加新的UI类型枚举
2. 创建对应的UI预制体
3. 实现UI的显示和隐藏逻辑

## 注意事项

1. 所有系统都采用单例模式，确保全局唯一性
2. 系统之间的通信通过事件和回调机制实现
3. 所有数据都支持序列化和反序列化
4. 系统设计考虑了扩展性，便于后续功能添加
5. 代码中包含了详细的中文注释，便于理解和维护

## 后续开发建议

1. 完善各个系统的具体实现细节
2. 添加更多的游戏内容和平衡性调整
3. 实现更丰富的视觉效果和动画
4. 添加多人游戏支持
5. 优化性能和内存使用
6. 添加更多的辅助工具和调试功能
