import { _decorator, resources, AssetManager, assetManager, Prefab, SpriteFrame, AudioClip, JsonAsset, Asset, error, warn } from 'cc';
import { logger, LogCategory } from './Logger';
import { EventBus, EventType } from './EventBus';
const { ccclass } = _decorator;

/**
 * 资源类型枚举
 */
export enum ResourceType {
    PREFAB = 'prefab',
    SPRITE_FRAME = 'sprite-frame',
    AUDIO_CLIP = 'audio-clip',
    JSON = 'json',
    TEXT = 'text',
    FONT = 'font',
    MATERIAL = 'material',
    ANIMATION = 'animation',
    SCENE = 'scene',
    ATLAS = 'atlas',
    SPINE = 'spine',
    DRAGONBONES = 'dragonbones',
    PARTICLE = 'particle',
    TEXTURE = 'texture',
}

/**
 * 资源包信息接口
 */
export interface IBundleInfo {
    name: string;
    version: string;
    isLoaded: boolean;
    assetCount: number;
}

/**
 * 资源加载进度回调
 */
export type ProgressCallback = (finished: number, total: number, item: AssetManager.RequestItem) => void;

/**
 * 资源加载完成回调
 */
export type CompleteCallback<T = any> = (error: Error, assets: T) => void;

/**
 * 资源加载管理器
 * 负责游戏中的资源加载、缓存和释放
 * 采用单例模式，确保全局唯一性
 */
@ccclass('ResourceManager')
export class ResourceManager {
    private static _instance: ResourceManager = null;
    
    // 资源缓存，用于存储已加载的资源
    private _assetCache: Map<string, Asset> = new Map();
    
    // 资源引用计数，用于管理资源的生命周期
    private _assetRefCount: Map<string, number> = new Map();
    
    // 已加载的资源包
    private _loadedBundles: Map<string, AssetManager.Bundle> = new Map();
    
    // 是否自动释放未使用的资源
    private _autoRelease: boolean = true;
    
    // 自动释放的时间间隔（秒）
    private _autoReleaseInterval: number = 300;
    
    // 自动释放的计时器
    private _autoReleaseTimer: number = 0;
    
    /**
     * 获取单例实例
     */
    public static getInstance(): ResourceManager {
        if (!ResourceManager._instance) {
            ResourceManager._instance = new ResourceManager();
        }
        return ResourceManager._instance;
    }
    
    /**
     * 私有构造函数，防止外部直接创建实例
     */
    private constructor() {
        this._assetCache = new Map<string, Asset>();
        this._assetRefCount = new Map<string, number>();
        this._loadedBundles = new Map<string, AssetManager.Bundle>();
        
        // 初始化自动释放计时器
        if (this._autoRelease) {
            this._startAutoReleaseTimer();
        }
        
        logger.info(LogCategory.RESOURCE, '资源管理器初始化完成');
    }
    
    /**
     * 设置是否自动释放未使用的资源
     * @param auto 是否自动释放
     * @param interval 自动释放的时间间隔（秒）
     */
    public setAutoRelease(auto: boolean, interval: number = 300): void {
        this._autoRelease = auto;
        this._autoReleaseInterval = interval;
        
        if (auto) {
            this._startAutoReleaseTimer();
        }
    }
    
    /**
     * 启动自动释放计时器
     */
    private _startAutoReleaseTimer(): void {
        // 在实际项目中，可以使用 setInterval 或游戏引擎的定时器
        // 这里仅作为示例
        this._autoReleaseTimer = setInterval(() => {
            this.releaseUnusedAssets();
        }, this._autoReleaseInterval * 1000);
    }
    
    /**
     * 加载资源包
     * @param bundleName 资源包名称
     * @param onProgress 进度回调
     * @param onComplete 完成回调
     */
    public loadBundle(bundleName: string, onProgress?: ProgressCallback, onComplete?: CompleteCallback<AssetManager.Bundle>): void {
        // 检查资源包是否已加载
        if (this._loadedBundles.has(bundleName)) {
            const bundle = this._loadedBundles.get(bundleName);
            if (onComplete) {
                onComplete(null, bundle);
            }
            return;
        }
        
        logger.info(LogCategory.RESOURCE, `开始加载资源包: ${bundleName}`);
        
        // 加载资源包
        assetManager.loadBundle(bundleName, (err, bundle) => {
            if (err) {
                logger.error(LogCategory.RESOURCE, `加载资源包失败: ${bundleName}`, err);
                if (onComplete) {
                    onComplete(err, null);
                }
                return;
            }
            
            // 缓存已加载的资源包
            this._loadedBundles.set(bundleName, bundle);
            
            logger.info(LogCategory.RESOURCE, `资源包加载完成: ${bundleName}`);
            
            if (onComplete) {
                onComplete(null, bundle);
            }
            
            // 触发资源包加载完成事件
            EventBus.getInstance().emit(EventType.RESOURCE_CHANGED, {
                type: 'bundle_loaded',
                bundleName: bundleName
            });
        });
    }
    
    /**
     * 获取已加载的资源包
     * @param bundleName 资源包名称
     */
    public getBundle(bundleName: string): AssetManager.Bundle {
        return this._loadedBundles.get(bundleName);
    }
    
    /**
     * 获取所有已加载的资源包信息
     */
    public getAllBundleInfo(): IBundleInfo[] {
        const bundleInfos: IBundleInfo[] = [];
        
        this._loadedBundles.forEach((bundle, name) => {
            bundleInfos.push({
                name: name,
                version: bundle.getInfoWithPath('config.json')?.ver || '1.0.0',
                isLoaded: true,
                assetCount: 0 // 这里需要遍历资源包中的所有资源，暂时设为0
            });
        });
        
        return bundleInfos;
    }
    
    /**
     * 加载资源
     * @param path 资源路径
     * @param type 资源类型
     * @param bundleName 资源包名称，默认为 'resources'
     * @param onProgress 进度回调
     * @param onComplete 完成回调
     */
    public loadAsset<T extends Asset>(path: string, type: typeof Asset | null = null, bundleName: string = 'resources', onProgress?: ProgressCallback, onComplete?: CompleteCallback<T>): void {
        // 生成资源唯一标识符
        const assetKey = this._getAssetKey(bundleName, path);
        
        // 检查资源是否已加载
        if (this._assetCache.has(assetKey)) {
            const asset = this._assetCache.get(assetKey) as T;
            // 增加引用计数
            this._addAssetRef(assetKey);
            
            if (onComplete) {
                onComplete(null, asset);
            }
            return;
        }
        
        logger.info(LogCategory.RESOURCE, `开始加载资源: ${path}, 类型: ${type?.name || '自动'}, 资源包: ${bundleName}`);
        
        // 获取资源包
        let bundle: AssetManager.Bundle = null;
        
        if (bundleName === 'resources') {
            bundle = resources;
        } else {
            bundle = this._loadedBundles.get(bundleName);
            
            if (!bundle) {
                // 如果资源包未加载，先加载资源包
                this.loadBundle(bundleName, onProgress, (err, loadedBundle) => {
                    if (err) {
                        if (onComplete) {
                            onComplete(err, null);
                        }
                        return;
                    }
                    
                    // 资源包加载完成后，加载资源
                    this._loadAssetFromBundle(loadedBundle, path, type, assetKey, onProgress, onComplete);
                });
                return;
            }
        }
        
        // 从资源包中加载资源
        this._loadAssetFromBundle(bundle, path, type, assetKey, onProgress, onComplete);
    }
    
    /**
     * 从资源包中加载资源
     * @param bundle 资源包
     * @param path 资源路径
     * @param type 资源类型
     * @param assetKey 资源唯一标识符
     * @param onProgress 进度回调
     * @param onComplete 完成回调
     */
    private _loadAssetFromBundle<T extends Asset>(bundle: AssetManager.Bundle, path: string, type: typeof Asset | null, assetKey: string, onProgress?: ProgressCallback, onComplete?: CompleteCallback<T>): void {
        bundle.load(path, type, onProgress, (err, asset: T) => {
            if (err) {
                logger.error(LogCategory.RESOURCE, `加载资源失败: ${path}`, err);
                if (onComplete) {
                    onComplete(err, null);
                }
                return;
            }
            
            // 缓存资源
            this._assetCache.set(assetKey, asset);
            // 初始化引用计数
            this._assetRefCount.set(assetKey, 1);
            
            logger.info(LogCategory.RESOURCE, `资源加载完成: ${path}`);
            
            if (onComplete) {
                onComplete(null, asset);
            }
            
            // 触发资源加载完成事件
            EventBus.getInstance().emit(EventType.RESOURCE_CHANGED, {
                type: 'asset_loaded',
                path: path,
                assetType: asset.constructor.name
            });
        });
    }
    
    /**
     * 加载多个资源
     * @param paths 资源路径数组
     * @param type 资源类型
     * @param bundleName 资源包名称，默认为 'resources'
     * @param onProgress 进度回调
     * @param onComplete 完成回调
     */
    public loadAssets<T extends Asset>(paths: string[], type: typeof Asset | null = null, bundleName: string = 'resources', onProgress?: ProgressCallback, onComplete?: CompleteCallback<T[]>): void {
        if (!paths || paths.length === 0) {
            if (onComplete) {
                onComplete(new Error('资源路径数组为空'), null);
            }
            return;
        }
        
        logger.info(LogCategory.RESOURCE, `开始批量加载资源, 数量: ${paths.length}, 资源包: ${bundleName}`);
        
        // 获取资源包
        let bundle: AssetManager.Bundle = null;
        
        if (bundleName === 'resources') {
            bundle = resources;
        } else {
            bundle = this._loadedBundles.get(bundleName);
            
            if (!bundle) {
                // 如果资源包未加载，先加载资源包
                this.loadBundle(bundleName, onProgress, (err, loadedBundle) => {
                    if (err) {
                        if (onComplete) {
                            onComplete(err, null);
                        }
                        return;
                    }
                    
                    // 资源包加载完成后，加载资源
                    this._loadAssetsFromBundle(loadedBundle, paths, type, bundleName, onProgress, onComplete);
                });
                return;
            }
        }
        
        // 从资源包中加载资源
        this._loadAssetsFromBundle(bundle, paths, type, bundleName, onProgress, onComplete);
    }
    
    /**
     * 从资源包中加载多个资源
     * @param bundle 资源包
     * @param paths 资源路径数组
     * @param type 资源类型
     * @param bundleName 资源包名称
     * @param onProgress 进度回调
     * @param onComplete 完成回调
     */
    private _loadAssetsFromBundle<T extends Asset>(bundle: AssetManager.Bundle, paths: string[], type: typeof Asset | null, bundleName: string, onProgress?: ProgressCallback, onComplete?: CompleteCallback<T[]>): void {
        bundle.load(paths, type, onProgress, (err, assets: T[]) => {
            if (err) {
                logger.error(LogCategory.RESOURCE, `批量加载资源失败`, err);
                if (onComplete) {
                    onComplete(err, null);
                }
                return;
            }
            
            // 缓存资源并初始化引用计数
            for (let i = 0; i < paths.length; i++) {
                const assetKey = this._getAssetKey(bundleName, paths[i]);
                this._assetCache.set(assetKey, assets[i]);
                this._assetRefCount.set(assetKey, 1);
            }
            
            logger.info(LogCategory.RESOURCE, `批量资源加载完成, 数量: ${assets.length}`);
            
            if (onComplete) {
                onComplete(null, assets);
            }
            
            // 触发资源加载完成事件
            EventBus.getInstance().emit(EventType.RESOURCE_CHANGED, {
                type: 'assets_loaded',
                count: assets.length
            });
        });
    }
    
    /**
     * 预加载资源
     * @param path 资源路径
     * @param type 资源类型
     * @param bundleName 资源包名称，默认为 'resources'
     * @param onProgress 进度回调
     * @param onComplete 完成回调
     */
    public preloadAsset(path: string, type: typeof Asset | null = null, bundleName: string = 'resources', onProgress?: ProgressCallback, onComplete?: CompleteCallback): void {
        logger.info(LogCategory.RESOURCE, `预加载资源: ${path}, 资源包: ${bundleName}`);
        
        // 获取资源包
        let bundle: AssetManager.Bundle = null;
        
        if (bundleName === 'resources') {
            bundle = resources;
        } else {
            bundle = this._loadedBundles.get(bundleName);
            
            if (!bundle) {
                // 如果资源包未加载，先加载资源包
                this.loadBundle(bundleName, onProgress, (err, loadedBundle) => {
                    if (err) {
                        if (onComplete) {
                            onComplete(err, null);
                        }
                        return;
                    }
                    
                    // 资源包加载完成后，预加载资源
                    loadedBundle.preload(path, type, onProgress, onComplete);
                });
                return;
            }
        }
        
        // 从资源包中预加载资源
        bundle.preload(path, type, onProgress, onComplete);
    }
    
    /**
     * 预加载多个资源
     * @param paths 资源路径数组
     * @param type 资源类型
     * @param bundleName 资源包名称，默认为 'resources'
     * @param onProgress 进度回调
     * @param onComplete 完成回调
     */
    public preloadAssets(paths: string[], type: typeof Asset | null = null, bundleName: string = 'resources', onProgress?: ProgressCallback, onComplete?: CompleteCallback): void {
        if (!paths || paths.length === 0) {
            if (onComplete) {
                onComplete(new Error('资源路径数组为空'), null);
            }
            return;
        }
        
        logger.info(LogCategory.RESOURCE, `批量预加载资源, 数量: ${paths.length}, 资源包: ${bundleName}`);
        
        // 获取资源包
        let bundle: AssetManager.Bundle = null;
        
        if (bundleName === 'resources') {
            bundle = resources;
        } else {
            bundle = this._loadedBundles.get(bundleName);
            
            if (!bundle) {
                // 如果资源包未加载，先加载资源包
                this.loadBundle(bundleName, onProgress, (err, loadedBundle) => {
                    if (err) {
                        if (onComplete) {
                            onComplete(err, null);
                        }
                        return;
                    }
                    
                    // 资源包加载完成后，预加载资源
                    loadedBundle.preload(paths, type, onProgress, onComplete);
                });
                return;
            }
        }
        
        // 从资源包中预加载资源
        bundle.preload(paths, type, onProgress, onComplete);
    }
    
    /**
     * 获取已加载的资源
     * @param path 资源路径
     * @param type 资源类型
     * @param bundleName 资源包名称，默认为 'resources'
     */
    public getAsset<T extends Asset>(path: string, type?: typeof Asset, bundleName: string = 'resources'): T {
        const assetKey = this._getAssetKey(bundleName, path);
        
        if (this._assetCache.has(assetKey)) {
            // 增加引用计数
            this._addAssetRef(assetKey);
            return this._assetCache.get(assetKey) as T;
        }
        
        logger.warn(LogCategory.RESOURCE, `获取资源失败，资源未加载: ${path}, 资源包: ${bundleName}`);
        return null;
    }
    
    /**
     * 释放资源
     * @param path 资源路径
     * @param bundleName 资源包名称，默认为 'resources'
     */
    public releaseAsset(path: string, bundleName: string = 'resources'): void {
        const assetKey = this._getAssetKey(bundleName, path);
        
        if (!this._assetCache.has(assetKey)) {
            logger.warn(LogCategory.RESOURCE, `释放资源失败，资源未加载: ${path}, 资源包: ${bundleName}`);
            return;
        }
        
        // 减少引用计数
        this._decAssetRef(assetKey);
    }
    
    /**
     * 释放资源包
     * @param bundleName 资源包名称
     */
    public releaseBundle(bundleName: string): void {
        if (!this._loadedBundles.has(bundleName)) {
            logger.warn(LogCategory.RESOURCE, `释放资源包失败，资源包未加载: ${bundleName}`);
            return;
        }
        
        logger.info(LogCategory.RESOURCE, `释放资源包: ${bundleName}`);
        
        // 释放资源包中的所有资源
        const bundle = this._loadedBundles.get(bundleName);
        bundle.releaseAll();
        
        // 从缓存中移除资源包
        this._loadedBundles.delete(bundleName);
        
        // 从资源缓存中移除该资源包的所有资源
        const prefix = `${bundleName}:`;
        this._assetCache.forEach((asset, key) => {
            if (key.startsWith(prefix)) {
                this._assetCache.delete(key);
                this._assetRefCount.delete(key);
            }
        });
        
        // 从资源管理器中移除资源包
        assetManager.removeBundle(bundle);
        
        // 触发资源包释放事件
        EventBus.getInstance().emit(EventType.RESOURCE_CHANGED, {
            type: 'bundle_released',
            bundleName: bundleName
        });
    }
    
    /**
     * 释放所有未使用的资源
     */
    public releaseUnusedAssets(): void {
        logger.info(LogCategory.RESOURCE, '开始释放未使用的资源');
        
        let releasedCount = 0;
        
        // 遍历所有资源，释放引用计数为0的资源
        this._assetRefCount.forEach((refCount, assetKey) => {
            if (refCount <= 0) {
                const asset = this._assetCache.get(assetKey);
                if (asset) {
                    asset.decRef();
                    this._assetCache.delete(assetKey);
                    this._assetRefCount.delete(assetKey);
                    releasedCount++;
                }
            }
        });
        
        logger.info(LogCategory.RESOURCE, `释放未使用的资源完成，共释放 ${releasedCount} 个资源`);
        
        // 触发资源释放事件
        if (releasedCount > 0) {
            EventBus.getInstance().emit(EventType.RESOURCE_CHANGED, {
                type: 'assets_released',
                count: releasedCount
            });
        }
    }
    
    /**
     * 释放所有资源
     */
    public releaseAllAssets(): void {
        logger.info(LogCategory.RESOURCE, '开始释放所有资源');
        
        // 释放所有资源包
        this._loadedBundles.forEach((bundle, name) => {
            if (name !== 'resources') { // 不释放 resources 资源包
                this.releaseBundle(name);
            }
        });
        
        // 释放所有资源
        this._assetCache.forEach((asset, key) => {
            asset.decRef();
        });
        
        // 清空缓存
        this._assetCache.clear();
        this._assetRefCount.clear();
        
        logger.info(LogCategory.RESOURCE, '释放所有资源完成');
        
        // 触发资源释放事件
        EventBus.getInstance().emit(EventType.RESOURCE_CHANGED, {
            type: 'all_assets_released'
        });
    }
    
    /**
     * 增加资源引用计数
     * @param assetKey 资源唯一标识符
     */
    private _addAssetRef(assetKey: string): void {
        if (this._assetRefCount.has(assetKey)) {
            const refCount = this._assetRefCount.get(assetKey);
            this._assetRefCount.set(assetKey, refCount + 1);
        } else {
            this._assetRefCount.set(assetKey, 1);
        }
    }
    
    /**
     * 减少资源引用计数
     * @param assetKey 资源唯一标识符
     */
    private _decAssetRef(assetKey: string): void {
        if (!this._assetRefCount.has(assetKey)) {
            return;
        }
        
        const refCount = this._assetRefCount.get(assetKey);
        const newRefCount = Math.max(0, refCount - 1);
        
        if (newRefCount === 0) {
            logger.info(LogCategory.RESOURCE, `资源引用计数为0，准备释放: ${assetKey}`);
            
            // 如果不是自动释放模式，立即释放资源
            if (!this._autoRelease) {
                const asset = this._assetCache.get(assetKey);
                if (asset) {
                    asset.decRef();
                    this._assetCache.delete(assetKey);
                    this._assetRefCount.delete(assetKey);
                    
                    logger.info(LogCategory.RESOURCE, `资源已释放: ${assetKey}`);
                    
                    // 触发资源释放事件
                    EventBus.getInstance().emit(EventType.RESOURCE_CHANGED, {
                        type: 'asset_released',
                        assetKey: assetKey
                    });
                }
            } else {
                // 自动释放模式下，只更新引用计数，等待定时释放
                this._assetRefCount.set(assetKey, newRefCount);
            }
        } else {
            this._assetRefCount.set(assetKey, newRefCount);
        }
    }
    
    /**
     * 获取资源唯一标识符
     * @param bundleName 资源包名称
     * @param path 资源路径
     */
    private _getAssetKey(bundleName: string, path: string): string {
        return `${bundleName}:${path}`;
    }
    
    /**
     * 获取资源缓存信息
     */
    public getCacheInfo(): { totalCount: number, totalSize: number } {
        let totalCount = this._assetCache.size;
        let totalSize = 0; // 实际项目中可以通过资源的内存占用来计算
        
        return { totalCount, totalSize };
    }
}

// 导出一个全局资源管理器实例，方便直接使用
export const resourceManager = ResourceManager.getInstance();