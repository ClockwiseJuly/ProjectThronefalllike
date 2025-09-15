# 快速开始指南

## 项目概述

这是一个基于Cocos Creator 3.8.7开发的类似《王权陨落》的游戏框架，结合了塔防、肉鸽和策略元素。框架采用模块化设计，具有高度的扩展性和可维护性。

## 环境要求

- Cocos Creator 3.8.7 或更高版本
- TypeScript 支持
- Node.js 12.0 或更高版本

## 快速开始

### 1. 项目设置

1. 在Cocos Creator中打开项目
2. 确保所有脚本文件都在 `assets/scripts/` 目录下
3. 检查TypeScript配置是否正确

### 2. 创建主场景

1. 创建一个新的场景文件
2. 在场景中创建一个空节点，命名为 "GameManager"
3. 将 `GameManager.ts` 脚本挂载到该节点上
4. 在GameManager节点下创建以下子节点：
   - UIRoot (UI根节点)
   - GameRoot (游戏根节点)
   - EffectRoot (特效根节点)

### 3. 设置UI层级

在UIRoot节点下创建以下子节点作为UI层级：
- BackgroundLayer (背景层)
- NormalLayer (普通层)
- DialogLayer (对话框层)
- PopupLayer (弹窗层)
- LoadingLayer (加载层)
- TopLayer (顶层)

### 4. 设置音频系统

1. 在场景中创建一个空节点，命名为 "AudioManager"
2. 将 `AudioManager.ts` 脚本挂载到该节点上
3. 添加AudioSource组件到AudioManager节点
4. 创建子节点用于不同类型的音频：
   - BGMSource (背景音乐)
   - SFXSource (音效)
   - VoiceSource (语音)
   - AmbientSource (环境音)

### 5. 运行游戏

1. 保存场景
2. 点击运行按钮
3. 查看控制台输出，确认所有系统正常初始化

## 基本使用

### 切换游戏状态

```typescript
import { GameState, GameStateType } from './Core/GameState';

const gameState = GameState.getInstance();
gameState.changeState(GameStateType.TOWER_DEFENSE);
```

### 显示UI界面

```typescript
import { UIManager, UIType } from './UI/UIManager';

const uiManager = UIManager.getInstance();
uiManager.showUI(UIType.MAIN_MENU);
```

### 播放音频

```typescript
import { AudioManager } from './Audio/AudioManager';

const audioManager = AudioManager.getInstance();
audioManager.playBGM("bgm_main_menu");
audioManager.playSFX("sfx_button_click");
```

### 保存游戏

```typescript
import { SaveSystem, SaveType } from './Core/SaveSystem';

const saveSystem = SaveSystem.getInstance();
saveSystem.saveGame(SaveType.MANUAL);
```

## 系统架构

### 核心系统
- **GameManager**: 游戏主管理器，协调所有系统
- **GameState**: 游戏状态管理，处理状态转换
- **SceneManager**: 场景管理，处理场景加载和切换
- **SaveSystem**: 数据持久化，处理存档和设置

### 游戏玩法系统
- **TowerDefenseSystem**: 塔防系统，处理塔的建造和战斗
- **RoguelikeSystem**: 肉鸽系统，处理随机生成和探索
- **EnemySystem**: 敌人系统，处理敌人AI和行为
- **ItemSystem**: 道具系统，处理道具和升级

### 辅助系统
- **UIManager**: UI管理，处理界面显示和层级
- **AudioManager**: 音频管理，处理音效和背景音乐

## 扩展指南

### 添加新的游戏状态

1. 在 `GameState.ts` 中添加新的状态枚举
2. 在 `SceneManager.ts` 中添加对应的场景处理
3. 在 `UIManager.ts` 中添加对应的UI处理

### 添加新的敌人类型

1. 在 `EnemySystem.ts` 中添加新的敌人类型枚举
2. 在 `initializeEnemyStats` 方法中添加敌人属性
3. 创建对应的敌人预制体

### 添加新的道具类型

1. 在 `ItemSystem.ts` 中添加新的道具类型枚举
2. 在 `initializeItemTemplates` 方法中添加道具模板
3. 实现道具的特殊效果

## 调试和测试

### 使用示例脚本

项目中包含了 `GameExample.ts` 示例脚本，展示了如何使用各个系统：

1. 将 `GameExample.ts` 挂载到场景中的任意节点
2. 运行游戏查看控制台输出
3. 参考示例代码学习系统使用方法

### 调试技巧

1. 使用控制台日志查看系统状态
2. 利用游戏状态监听器跟踪状态变化
3. 使用性能监控功能检查游戏性能

## 常见问题

### Q: 系统初始化失败怎么办？
A: 检查是否正确挂载了脚本，确保所有依赖的系统都已正确设置。

### Q: UI不显示怎么办？
A: 检查UI层级设置，确保Canvas和UI节点正确配置。

### Q: 音频不播放怎么办？
A: 检查AudioSource组件是否正确设置，确保音频文件路径正确。

### Q: 存档不工作怎么办？
A: 检查本地存储权限，确保浏览器支持localStorage。

## 性能优化建议

1. 使用对象池管理频繁创建和销毁的对象
2. 合理设置音频和特效的播放限制
3. 定期清理不需要的资源和数据
4. 使用LOD系统优化渲染性能

## 后续开发

1. 完善各个系统的具体实现
2. 添加更多的游戏内容和平衡性调整
3. 实现更丰富的视觉效果和动画
4. 添加多人游戏支持
5. 优化性能和内存使用

## 技术支持

如果在使用过程中遇到问题，可以：

1. 查看控制台错误信息
2. 参考示例代码和文档
3. 检查系统配置是否正确
4. 使用调试工具分析问题

## 更新日志

### v1.0.0
- 初始版本发布
- 实现基础框架结构
- 添加核心系统和管理器
- 提供完整的示例和文档
