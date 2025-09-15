import { _decorator } from 'cc';
const { ccclass } = _decorator;

/**
 * 游戏配置类
 * 包含游戏的各种配置参数，便于调整和平衡
 */
@ccclass('GameConfig')
export class GameConfig {
    // 游戏基础配置
    public static readonly GAME_VERSION = "1.0.0";
    public static readonly GAME_TITLE = "王权陨落类游戏";
    
    // 塔防配置
    public static readonly TOWER_DEFENSE = {
        // 波次配置
        WAVES: {
            TOTAL_WAVES: 10,           // 总波次数
            BOSS_WAVE_INTERVAL: 5,     // Boss波次间隔
            ELITE_WAVE_CHANCE: 0.2,    // 精英波次概率
        },
        
        // 资源配置
        RESOURCES: {
            STARTING_GOLD: 1000,       // 初始金币
            STARTING_LIVES: 20,        // 初始生命值
            GOLD_PER_KILL: 5,          // 每杀一个敌人获得的金币
        },
        
        // 塔配置
        TOWERS: {
            ARROW_TOWER: {
                DAMAGE: 25,
                RANGE: 3.0,
                ATTACK_SPEED: 1.0,
                COST: 100,
                UPGRADE_COST: 150,
            },
            CANNON_TOWER: {
                DAMAGE: 80,
                RANGE: 2.5,
                ATTACK_SPEED: 0.5,
                COST: 200,
                UPGRADE_COST: 300,
            },
            MAGIC_TOWER: {
                DAMAGE: 50,
                RANGE: 4.0,
                ATTACK_SPEED: 0.8,
                COST: 300,
                UPGRADE_COST: 450,
            }
        },
        
        // 敌人配置
        ENEMIES: {
            BASIC: {
                HEALTH: 50,
                SPEED: 1.0,
                DAMAGE: 10,
                GOLD_REWARD: 5,
            },
            FAST: {
                HEALTH: 30,
                SPEED: 2.0,
                DAMAGE: 8,
                GOLD_REWARD: 8,
            },
            TANK: {
                HEALTH: 150,
                SPEED: 0.5,
                DAMAGE: 15,
                GOLD_REWARD: 15,
            }
        }
    };
    
    // 肉鸽配置
    public static readonly ROGUELIKE = {
        // 房间配置
        ROOMS: {
            ROOM_COUNT: 8,             // 每层房间数量
            BOSS_ROOM_INTERVAL: 5,     // Boss房间间隔
            ELITE_ROOM_CHANCE: 0.2,    // 精英房间概率
        },
        
        // 玩家配置
        PLAYER: {
            STARTING_HEALTH: 100,
            STARTING_MANA: 50,
            STARTING_ATTACK: 20,
            STARTING_DEFENSE: 5,
            STARTING_SPEED: 1.0,
            STARTING_LUCK: 1.0,
        },
        
        // 难度配置
        DIFFICULTY: {
            BASE_MULTIPLIER: 1.0,      // 基础难度倍数
            FLOOR_INCREASE: 0.2,       // 每层难度增加
            MAX_DIFFICULTY: 5.0,       // 最大难度
        }
    };
    
    // UI配置
    public static readonly UI = {
        // 动画配置
        ANIMATIONS: {
            FADE_TIME: 0.3,            // 淡入淡出时间
            SLIDE_TIME: 0.5,           // 滑动动画时间
            SCALE_TIME: 0.2,           // 缩放动画时间
        },
        
        // 层级配置
        LAYERS: {
            BACKGROUND: 0,
            NORMAL: 1,
            DIALOG: 2,
            POPUP: 3,
            LOADING: 4,
            TOP: 5,
        }
    };
    
    // 音频配置
    public static readonly AUDIO = {
        // 音量配置
        VOLUME: {
            MASTER: 1.0,
            BGM: 0.8,
            SFX: 0.9,
            VOICE: 1.0,
            AMBIENT: 0.6,
        },
        
        // 淡入淡出配置
        FADE: {
            FADE_TIME: 1.0,            // 淡入淡出时间
            CROSSFADE_TIME: 2.0,       // 交叉淡入淡出时间
        }
    };
    
    // 存档配置
    public static readonly SAVE = {
        // 自动存档配置
        AUTO_SAVE: {
            INTERVAL: 300,             // 自动存档间隔（秒）
            MAX_SAVES: 5,              // 最大自动存档数量
        },
        
        // 手动存档配置
        MANUAL_SAVE: {
            MAX_SAVES: 10,             // 最大手动存档数量
        },
        
        // 版本配置
        VERSION: {
            CURRENT: "1.0.0",
            MIN_SUPPORTED: "1.0.0",
        }
    };
    
    // 性能配置
    public static readonly PERFORMANCE = {
        // 帧率配置
        FRAME_RATE: {
            TARGET: 60,                // 目标帧率
            MIN: 30,                   // 最低帧率
        },
        
        // 对象池配置
        OBJECT_POOL: {
            ENEMY_POOL_SIZE: 50,       // 敌人对象池大小
            PROJECTILE_POOL_SIZE: 100, // 子弹对象池大小
            EFFECT_POOL_SIZE: 30,      // 特效对象池大小
        },
        
        // 渲染配置
        RENDERING: {
            MAX_PARTICLES: 1000,       // 最大粒子数
            MAX_LIGHTS: 10,            // 最大光源数
            SHADOW_QUALITY: 2,         // 阴影质量
        }
    };
    
    // 调试配置
    public static readonly DEBUG = {
        // 调试开关
        ENABLED: true,                 // 是否启用调试
        SHOW_FPS: true,                // 是否显示FPS
        SHOW_MEMORY: true,             // 是否显示内存使用
        SHOW_LOGS: true,               // 是否显示日志
        
        // 调试颜色
        COLORS: {
            DEBUG: "#00FF00",          // 调试信息颜色
            WARNING: "#FFFF00",        // 警告信息颜色
            ERROR: "#FF0000",          // 错误信息颜色
        }
    };
    
    // 本地化配置
    public static readonly LOCALIZATION = {
        // 支持的语言
        SUPPORTED_LANGUAGES: ["zh-CN", "en-US", "ja-JP"],
        
        // 默认语言
        DEFAULT_LANGUAGE: "zh-CN",
        
        // 语言文件路径
        LANGUAGE_FILES: {
            "zh-CN": "localization/zh-CN.json",
            "en-US": "localization/en-US.json",
            "ja-JP": "localization/ja-JP.json",
        }
    };
    
    // 网络配置
    public static readonly NETWORK = {
        // 服务器配置
        SERVER: {
            HOST: "localhost",
            PORT: 8080,
            TIMEOUT: 10000,            // 超时时间（毫秒）
        },
        
        // 重连配置
        RECONNECT: {
            MAX_ATTEMPTS: 3,           // 最大重连次数
            RETRY_INTERVAL: 5000,      // 重连间隔（毫秒）
        }
    };
    
    // 成就配置
    public static readonly ACHIEVEMENTS = {
        // 成就类型
        TYPES: {
            KILL_COUNT: "kill_count",      // 击杀数量
            SURVIVAL_TIME: "survival_time", // 生存时间
            TOWER_COUNT: "tower_count",    // 塔的数量
            ITEM_COUNT: "item_count",      // 道具数量
        },
        
        // 成就奖励
        REWARDS: {
            GOLD: "gold",                  // 金币奖励
            EXPERIENCE: "experience",      // 经验奖励
            ITEM: "item",                  // 道具奖励
            TITLE: "title",                // 称号奖励
        }
    };
    
    // 平衡性配置
    public static readonly BALANCE = {
        // 经验值配置
        EXPERIENCE: {
            BASE_EXP: 100,             // 基础经验值
            LEVEL_MULTIPLIER: 1.2,     // 等级倍数
            MAX_LEVEL: 100,            // 最大等级
        },
        
        // 金币配置
        GOLD: {
            BASE_GOLD: 10,             // 基础金币
            DIFFICULTY_MULTIPLIER: 1.5, // 难度倍数
            BONUS_MULTIPLIER: 2.0,     // 奖励倍数
        },
        
        // 伤害配置
        DAMAGE: {
            BASE_DAMAGE: 10,           // 基础伤害
            CRITICAL_MULTIPLIER: 2.0,  // 暴击倍数
            ELEMENTAL_MULTIPLIER: 1.5, // 元素伤害倍数
        }
    };
    
    /**
     * 获取配置值
     * @param path 配置路径，用点分隔
     * @returns 配置值
     */
    public static getConfig(path: string): any {
        const keys = path.split('.');
        let current = GameConfig as any;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                console.warn(`配置路径不存在: ${path}`);
                return null;
            }
        }
        
        return current;
    }
    
    /**
     * 设置配置值
     * @param path 配置路径，用点分隔
     * @param value 配置值
     */
    public static setConfig(path: string, value: any): void {
        const keys = path.split('.');
        let current = GameConfig as any;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
        console.log(`配置已更新: ${path} = ${value}`);
    }
    
    /**
     * 重置所有配置为默认值
     */
    public static resetToDefault(): void {
        console.log("重置配置为默认值");
        // 这里可以实现配置重置逻辑
    }
    
    /**
     * 验证配置的有效性
     * @returns 是否有效
     */
    public static validateConfig(): boolean {
        try {
            // 验证各种配置的有效性
            if (GameConfig.TOWER_DEFENSE.WAVES.TOTAL_WAVES <= 0) {
                console.error("总波次数必须大于0");
                return false;
            }
            
            if (GameConfig.ROGUELIKE.PLAYER.STARTING_HEALTH <= 0) {
                console.error("初始生命值必须大于0");
                return false;
            }
            
            if (GameConfig.AUDIO.VOLUME.MASTER < 0 || GameConfig.AUDIO.VOLUME.MASTER > 1) {
                console.error("主音量必须在0-1之间");
                return false;
            }
            
            console.log("配置验证通过");
            return true;
        } catch (error) {
            console.error("配置验证失败:", error);
            return false;
        }
    }
}
