import { _decorator, sys } from 'cc';
const { ccclass } = _decorator;

/**
 * 日志级别枚举
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4, // 不输出任何日志
}

/**
 * 日志类别枚举
 */
export enum LogCategory {
    GENERAL = 'General',
    GAME = 'Game',
    UI = 'UI',
    AUDIO = 'Audio',
    NETWORK = 'Network',
    RESOURCE = 'Resource',
    TOWER_DEFENSE = 'TowerDefense',
    ROGUELIKE = 'Roguelike',
    AI = 'AI',
    PHYSICS = 'Physics',
    SAVE = 'Save',
}

/**
 * 日志系统
 * 负责游戏中的日志记录和输出
 * 支持不同级别和类别的日志
 * 采用单例模式，确保全局唯一性
 */
@ccclass('Logger')
export class Logger {
    private static _instance: Logger = null;
    
    // 当前日志级别，低于此级别的日志不会输出
    private _logLevel: LogLevel = LogLevel.DEBUG;
    
    // 是否在控制台输出日志
    private _enableConsole: boolean = true;
    
    // 是否将日志保存到文件（仅在原生平台有效）
    private _enableFileLog: boolean = false;
    
    // 日志文件路径（仅在原生平台有效）
    private _logFilePath: string = '';
    
    // 日志缓存，用于在需要时导出日志
    private _logCache: string[] = [];
    
    // 日志缓存最大条数
    private _maxCacheCount: number = 1000;
    
    // 日志颜色配置
    private readonly _colors = {
        [LogLevel.DEBUG]: '#7F7F7F', // 灰色
        [LogLevel.INFO]: '#FFFFFF',  // 白色
        [LogLevel.WARN]: '#FFCC00',  // 黄色
        [LogLevel.ERROR]: '#FF0000', // 红色
    };
    
    /**
     * 获取单例实例
     */
    public static getInstance(): Logger {
        if (!Logger._instance) {
            Logger._instance = new Logger();
        }
        return Logger._instance;
    }
    
    /**
     * 私有构造函数，防止外部直接创建实例
     */
    private constructor() {
        this._logCache = [];
        console.log('[Logger] 初始化完成');
    }
    
    /**
     * 设置日志级别
     * @param level 日志级别
     */
    public setLogLevel(level: LogLevel): void {
        this._logLevel = level;
    }
    
    /**
     * 启用/禁用控制台日志
     * @param enable 是否启用
     */
    public enableConsole(enable: boolean): void {
        this._enableConsole = enable;
    }
    
    /**
     * 启用/禁用文件日志（仅在原生平台有效）
     * @param enable 是否启用
     * @param filePath 日志文件路径
     */
    public enableFileLog(enable: boolean, filePath: string = ''): void {
        this._enableFileLog = enable && sys.isNative;
        if (this._enableFileLog && filePath) {
            this._logFilePath = filePath;
        }
    }
    
    /**
     * 设置日志缓存最大条数
     * @param count 最大条数
     */
    public setMaxCacheCount(count: number): void {
        this._maxCacheCount = count;
    }
    
    /**
     * 清空日志缓存
     */
    public clearCache(): void {
        this._logCache = [];
    }
    
    /**
     * 获取日志缓存
     */
    public getLogCache(): string[] {
        return [...this._logCache];
    }
    
    /**
     * 导出日志到文件（仅在原生平台有效）
     * @param filePath 导出文件路径
     */
    public exportLogToFile(filePath: string): boolean {
        if (!sys.isNative) {
            this.error(LogCategory.GENERAL, '导出日志失败：仅在原生平台支持');
            return false;
        }
        
        try {
            const content = this._logCache.join('\n');
            // 使用 jsb.fileUtils 写入文件，这里仅作为示例
            // 实际使用时需要根据具体平台调整
            // jsb.fileUtils.writeStringToFile(content, filePath);
            return true;
        } catch (error) {
            this.error(LogCategory.GENERAL, `导出日志失败：${error.message}`);
            return false;
        }
    }
    
    /**
     * 记录调试级别日志
     * @param category 日志类别
     * @param message 日志消息
     * @param args 额外参数
     */
    public debug(category: LogCategory | string, message: string, ...args: any[]): void {
        this._log(LogLevel.DEBUG, category, message, args);
    }
    
    /**
     * 记录信息级别日志
     * @param category 日志类别
     * @param message 日志消息
     * @param args 额外参数
     */
    public info(category: LogCategory | string, message: string, ...args: any[]): void {
        this._log(LogLevel.INFO, category, message, args);
    }
    
    /**
     * 记录警告级别日志
     * @param category 日志类别
     * @param message 日志消息
     * @param args 额外参数
     */
    public warn(category: LogCategory | string, message: string, ...args: any[]): void {
        this._log(LogLevel.WARN, category, message, args);
    }
    
    /**
     * 记录错误级别日志
     * @param category 日志类别
     * @param message 日志消息
     * @param args 额外参数
     */
    public error(category: LogCategory | string, message: string, ...args: any[]): void {
        this._log(LogLevel.ERROR, category, message, args);
    }
    
    /**
     * 内部日志记录方法
     * @param level 日志级别
     * @param category 日志类别
     * @param message 日志消息
     * @param args 额外参数
     */
    private _log(level: LogLevel, category: LogCategory | string, message: string, args: any[]): void {
        // 检查日志级别
        if (level < this._logLevel) {
            return;
        }
        
        // 获取日志级别名称
        const levelName = LogLevel[level];
        
        // 获取当前时间
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
        
        // 格式化日志消息
        let logMessage = `[${timeStr}][${levelName}][${category}] ${message}`;
        
        // 添加到日志缓存
        this._logCache.push(logMessage);
        
        // 如果超出最大缓存数量，删除最早的日志
        if (this._logCache.length > this._maxCacheCount) {
            this._logCache.shift();
        }
        
        // 控制台输出
        if (this._enableConsole) {
            const color = this._colors[level] || '#FFFFFF';
            
            switch (level) {
                case LogLevel.DEBUG:
                    console.log(`%c${logMessage}`, `color: ${color}`, ...args);
                    break;
                case LogLevel.INFO:
                    console.info(`%c${logMessage}`, `color: ${color}`, ...args);
                    break;
                case LogLevel.WARN:
                    console.warn(`%c${logMessage}`, `color: ${color}`, ...args);
                    break;
                case LogLevel.ERROR:
                    console.error(`%c${logMessage}`, `color: ${color}`, ...args);
                    break;
            }
        }
        
        // 文件日志（仅在原生平台有效）
        if (this._enableFileLog && this._logFilePath && sys.isNative) {
            // 这里需要根据具体平台实现文件日志
            // 例如使用 jsb.fileUtils.writeStringToFile 等
        }
    }
}

// 导出一个全局日志实例，方便直接使用
export const logger = Logger.getInstance();