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
    
    // 日夜循环相关事件
    DAY_START = 'day_start',
    NIGHT_START = 'night_start',
    DAY_NIGHT_TRANSITION = 'day_night_transition',
    
    // 塔防模式相关事件
    TOWER_PLACED = 'tower_placed',
    TOWER_UPGRADED = 'tower_upgraded',
    TOWER_SOLD = 'tower_sold',
    WAVE_START = 'wave_start',
    WAVE_COMPLETE = 'wave_complete',
    ENEMY_SPAWNED = 'enemy_spawned',
    ENEMY_REACHED_END = 'enemy_reached_end',
    
    // 肉鸽模式相关事件
    DUNGEON_GENERATED = 'dungeon_generated',
    ROOM_ENTERED = 'room_entered',
    ROOM_CLEARED = 'room_cleared',
    ITEM_PICKED = 'item_picked',
    ABILITY_UNLOCKED = 'ability_unlocked',
    
    // 角色相关事件
    PLAYER_DAMAGED = 'player_damaged',
    PLAYER_HEALED = 'player_healed',
    PLAYER_DIED = 'player_died',
    PLAYER_LEVEL_UP = 'player_level_up',
    ENEMY_DAMAGED = 'enemy_damaged',
    ENEMY_DIED = 'enemy_died',
    
    // 资源相关事件
    RESOURCE_CHANGED = 'resource_changed',
    GOLD_CHANGED = 'gold_changed',
    EXPERIENCE_CHANGED = 'experience_changed',
    
    // UI相关事件
    UI_SHOW = 'ui_show',
    UI_HIDE = 'ui_hide',
    BUTTON_CLICKED = 'button_clicked',
    
    // 系统相关事件
    SAVE_GAME = 'save_game',
    LOAD_GAME = 'load_game',
    SETTINGS_CHANGED = 'settings_changed',
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