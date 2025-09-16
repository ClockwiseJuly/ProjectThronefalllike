import { _decorator } from 'cc';
const { ccclass } = _decorator;

/**
 * 事件类型枚举
 * 定义游戏中所有可能的事件类型
 */
export enum EventType {
    // 游戏流程相关事件
    GAME_START = 'game_start',
    GAME_PAUSE = 'game_pause',
    GAME_RESUME = 'game_resume',
    GAME_OVER = 'game_over',
    GAME_VICTORY = 'game_victory',

    GAME_STATE_CHANGED = 'game_state_changed',

    LEVEL_COMPLETED = 'level_completed',

    SCENE_LOADED = 'scene_loaded',
    SCENE_LOADING = 'scene_loading',
    SCENE_LOADING_PROGRESS = 'scene_loading_progress',
    SCENE_LOAD_FAILED = 'scene_load_failed',
    EVENT_AFTER_SCENE_LAUNCH = 'event_after_scene_launch',  

    
    // 日夜循环相关事件
    DAY_START = 'day_start',
    NIGHT_START = 'night_start',
    DAY_NIGHT_TRANSITION = 'day_night_transition',
    DAY_NIGHT_CHANGED = 'day_night_changed',
    
    // 塔防模式相关事件
    TOWER_PLACED = 'tower_placed',
    TOWER_UPGRADED = 'tower_upgraded',
    TOWER_SOLD = 'tower_sold',
    TOWER_SYSTEM_STATE_CHANGED = 'tower_system_state_changed',
    WAVE_START = 'wave_start',
    WAVE_COMPLETE = 'wave_complete',
    ENEMY_SPAWNED = 'enemy_spawned',
    ENEMY_REACHED_END = 'enemy_reached_end',
    TOWER_GRIDS_INITIALIZED = 'tower_grids_initialized',
    TOWER_GRID_SELECTED = 'tower_grid_selected',
    TOWER_GRID_DESELECTED = 'tower_grid_deselected',
    TOWER_BUILT = 'tower_built',
    
    // 肉鸽模式相关事件
    DUNGEON_GENERATED = 'dungeon_generated',
    ROOM_ENTERED = 'room_entered',
    ROOM_CLEARED = 'room_cleared',
    ITEM_PICKED = 'item_picked',
    ABILITY_UNLOCKED = 'ability_unlocked',
    ROGUELIKE_SYSTEM_STATE_CHANGED = 'roguelike_system_state_changed',
    ROGUELIKE_RUN_STARTED = 'roguelike_run_started',
    ROGUELIKE_RUN_ENDED = 'roguelike_run_ended',

    // 角色相关事件
    PLAYER_ATTACKED = 'player_attacked',
    PLAYER_HURT = 'player_hurt',
    PLAYER_DAMAGED = 'player_damaged',
    PLAYER_HEALED = 'player_healed',
    PLAYER_DIED = 'player_died',
    PLAYER_LEVEL_UP = 'player_level_up',
    PLAYER_DEATH = 'player_death',
    PLAYER_REVIVE = 'player_revive',
    PLAYER_USE_SKILL = 'player_use_skill',
    PLAYER_ATTRIBUTE_CHANGED = 'player_attribute_changed',
    PLAYER_EXPERIENCE_CHANGED = 'player_experience_changed',

    ENEMY_DAMAGED = 'enemy_damaged',
    ENEMY_DIED = 'enemy_died',
    ENEMY_AI_STATE_CHANGED = 'enemy_ai_state_changed',
    ENEMY_RANGED_ATTACK = 'enemy_ranged_attack',
    ENEMY_HURT = 'enemy_hurt',
    ENEMY_DEATH = 'enemy_death',
    ENEMY_DROP_LOOT = 'enemy_drop_loot',

    CHARACTER_CREATED = 'character_created',
    CHARACTER_ATTACK = 'character_attack',     // 添加角色攻击事件
    CHARACTER_HURT = 'character_hurt',         // 添加角色受伤事件
    CHARACTER_DODGE = 'character_dodge',       // 添加角色闪避事件
    CHARACTER_DEATH = 'character_death',       // 添加角色死亡事件
    CHARACTER_HEAL = 'character_heal',         // 添加角色治疗事件
    CHARACTER_CRITICAL_HIT = 'character_critical_hit', // 添加角色暴击事件
    CHARACTER_REVIVE = 'character_revive', // 添加角色复活事件
    CHARACTER_STATUS_EFFECT_ADDED = 'character_status_effect_added', // 添加角色状态效果事件
    CHARACTER_STATUS_EFFECT_REMOVED = 'character_status_effect_removed', // 添加角色状态效果移除事件
    CHARACTER_SKILL_COOLDOWN_COMPLETE = 'character_skill_cooldown_complete', // 添加角色技能冷却完成事件
    CHARACTER_INVINCIBLE_END = 'character_invincible_end', // 添加角色无敌结束事件
    CHARACTER_MOVE_COMPLETE = 'character_move_complete', // 添加角色移动完成事件
    CHARACTER_STATE_CHANGED = 'character_state_changed', // 添加角色状态改变事件
    CHARACTER_ATTRIBUTE_CHANGED = 'character_attribute_changed', // 添加角色属性改变事件

    WEAPON_UNLOCKED = 'weapon_unlocked',
    WEAPON_EQUIPPED = 'weapon_equipped',
    WEAPON_UPGRADED = 'weapon_upgraded',

    SKILL_UNLOCKED = 'skill_unlocked',
    SKILL_EQUIPPED = 'skill_equipped',
    SKILL_UPGRADED = 'skill_upgraded',
    SKILL_COOLDOWN_STARTED = 'skill_cooldown_started',
    
    // 资源相关事件
    RESOURCE_CHANGED = 'resource_changed',
    GOLD_CHANGED = 'gold_changed',
    EXPERIENCE_CHANGED = 'experience_changed',
    PERMANENT_UPGRADE_PURCHASED = 'permanent_upgrade_purchased',
    SOUL_SHARDS_CHANGED = 'soul_shards_changed',
    UPGRADE_POINTS_CHANGED = 'upgrade_points_changed',
    SHOW_UPGRADE_OPTIONS = 'show_upgrade_options',
    PERMANENT_UPGRADE_POINTS_CHANGED = 'permanent_upgrade_points_changed',
    PERMANENT_UPGRADE_UNLOCKED = 'permanent_upgrade_unlocked',
    PERMANENT_UPGRADE_LEVEL_INCREASED = 'permanent_upgrade_level_increased',

    // UI相关事件
    UI_SHOW = 'ui_show',
    UI_HIDE = 'ui_hide',
    BUTTON_CLICKED = 'button_clicked',
    
    // 系统相关事件
    SAVE_GAME = 'save_game',
    LOAD_GAME = 'load_game',
    SETTINGS_CHANGED = 'settings_changed',
    GAME_MODE_CHANGED = 'game_mode_changed',
    GAME_PROGRESS_CHANGED = 'game_progress_changed',
    GAME_STATE_LOADED = 'game_state_loaded',
    BEFORE_SAVE = 'before_save',
    AFTER_SAVE = 'after_save',
    SAVE_FAILED = 'save_failed',
    LOAD_FAILED = 'load_failed',
    BEFORE_LOAD = 'before_load',
    AFTER_LOAD = 'after_load',
    SAVE_DELETED = 'save_deleted',
    GET_GAME_STATE_DATA = 'get_game_state_data',
    GET_PLAYER_DATA = 'get_player_data',
    GET_SCENE_DATA = 'get_scene_data',
    GET_GAME_PROGRESS_DATA = 'get_game_progress_data',
    GET_GAME_MODE = 'get_game_mode',
    ALL_SAVES_CLEARED = 'all_saves_cleared',
    PERMANENT_UPGRADES_RESET = 'permanent_upgrades_reset',
    SETTINGS_SAVED = 'settings_saved',
}

/**
 * 事件数据接口
 */
export interface IEventData {
    [key: string]: any;
}

/**
 * 事件回调函数类型
 */
export type EventCallback = (data: IEventData) => void;

/**
 * 事件总线系统
 * 负责游戏中各个系统之间的事件通信
 * 采用单例模式，确保全局唯一性
 */
@ccclass('EventBus')
export class EventBus {
    private static _instance: EventBus = null;
    private _listeners: Map<string, EventCallback[]> = new Map();
    
    /**
     * 获取单例实例
     */
    public static getInstance(): EventBus {
        if (!EventBus._instance) {
            EventBus._instance = new EventBus();
        }
        return EventBus._instance;
    }
    
    /**
     * 私有构造函数，防止外部直接创建实例
     */
    private constructor() {
        this._listeners = new Map<string, EventCallback[]>();
        console.log('[EventBus] 初始化完成');
    }
    
    /**
     * 注册事件监听器
     * @param eventType 事件类型
     * @param callback 回调函数
     */
    public on(eventType: EventType | string, callback: EventCallback): void {
        if (!this._listeners.has(eventType)) {
            this._listeners.set(eventType, []);
        }
        
        const callbacks = this._listeners.get(eventType);
        // 避免重复注册相同的回调
        if (callbacks.indexOf(callback) === -1) {
            callbacks.push(callback);
            console.log(`[EventBus] 注册事件: ${eventType}`);
        }
    }
    
    /**
     * 注销事件监听器
     * @param eventType 事件类型
     * @param callback 回调函数，如果不提供则注销该事件类型的所有监听器
     */
    public off(eventType: EventType | string, callback?: EventCallback): void {
        if (!this._listeners.has(eventType)) {
            return;
        }
        
        if (!callback) {
            // 注销该事件类型的所有监听器
            this._listeners.delete(eventType);
            console.log(`[EventBus] 注销所有事件: ${eventType}`);
            return;
        }
        
        const callbacks = this._listeners.get(eventType);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
            console.log(`[EventBus] 注销事件: ${eventType}`);
        }
        
        // 如果没有监听器了，则删除该事件类型
        if (callbacks.length === 0) {
            this._listeners.delete(eventType);
        }
    }
    
    /**
     * 触发事件
     * @param eventType 事件类型
     * @param data 事件数据
     */
    public emit(eventType: EventType | string, data: IEventData = {}): void {
        if (!this._listeners.has(eventType)) {
            return;
        }
        
        const callbacks = this._listeners.get(eventType);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBus] 事件处理错误: ${eventType}`, error);
            }
        });
        
        console.log(`[EventBus] 触发事件: ${eventType}`, data);
    }
    
    /**
     * 只监听一次事件，触发后自动注销
     * @param eventType 事件类型
     * @param callback 回调函数
     */
    public once(eventType: EventType | string, callback: EventCallback): void {
        const onceCallback = (data: IEventData) => {
            callback(data);
            this.off(eventType, onceCallback);
        };
        
        this.on(eventType, onceCallback);
    }
    
    /**
     * 清空所有事件监听器
     */
    public clear(): void {
        this._listeners.clear();
        console.log('[EventBus] 清空所有事件监听器');
    }
    
    /**
     * 获取指定事件类型的监听器数量
     * @param eventType 事件类型
     */
    public getListenerCount(eventType: EventType | string): number {
        if (!this._listeners.has(eventType)) {
            return 0;
        }
        
        return this._listeners.get(eventType).length;
    }
}