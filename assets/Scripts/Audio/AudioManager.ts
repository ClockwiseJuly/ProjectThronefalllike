import { _decorator, Component, AudioClip, AudioSource, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 音频类型枚举
 */
export enum AudioType {
    BGM = 0,            // 背景音乐
    SFX = 1,            // 音效
    VOICE = 2,          // 语音
    AMBIENT = 3,        // 环境音
}

/**
 * 音频优先级枚举
 */
export enum AudioPriority {
    LOW = 0,            // 低优先级
    NORMAL = 1,         // 普通优先级
    HIGH = 2,           // 高优先级
    CRITICAL = 3,       // 关键优先级
}

/**
 * 音频数据接口
 */
export interface IAudioData {
    id: string;
    audioType: AudioType;
    priority: AudioPriority;
    volume: number;
    loop: boolean;
    fadeIn: boolean;
    fadeOut: boolean;
    fadeTime: number;
    maxInstances: number; // 最大同时播放实例数
    currentInstances: number; // 当前播放实例数
}

/**
 * 音频管理器
 * 负责音频的播放、停止、音量控制等
 */
@ccclass('AudioManager')
export class AudioManager extends Component {
    private static _instance: AudioManager = null;
    
    @property(AudioSource)
    public bgmSource: AudioSource = null; // 背景音乐音频源
    
    @property(AudioSource)
    public sfxSource: AudioSource = null; // 音效音频源
    
    @property(AudioSource)
    public voiceSource: AudioSource = null; // 语音音频源
    
    @property(AudioSource)
    public ambientSource: AudioSource = null; // 环境音音频源
    
    @property([AudioClip])
    public audioClips: AudioClip[] = []; // 音频剪辑数组
    
    // 音频管理
    private _audioData: Map<string, IAudioData> = new Map();
    private _audioSources: Map<AudioType, AudioSource> = new Map();
    private _playingAudio: Map<string, AudioSource> = new Map();
    
    // 音量控制
    private _masterVolume: number = 1.0;
    private _bgmVolume: number = 0.8;
    private _sfxVolume: number = 0.9;
    private _voiceVolume: number = 1.0;
    private _ambientVolume: number = 0.6;
    
    // 音频设置
    private _isMuted: boolean = false;
    private _fadeTime: number = 1.0;
    
    /**
     * 获取单例实例
     */
    public static getInstance(): AudioManager {
        return AudioManager._instance;
    }
    
    onLoad() {
        if (AudioManager._instance === null) {
            AudioManager._instance = this;
            this.initializeAudioManager();
        } else {
            this.node.destroy();
        }
    }
    
    /**
     * 初始化音频管理器
     */
    private initializeAudioManager(): void {
        console.log("音频管理器初始化");
        
        // 初始化音频源映射
        this.initializeAudioSources();
        
        // 初始化音频数据
        this.initializeAudioData();
        
        // 设置初始音量
        this.updateAllVolumes();
        
        console.log("音频管理器初始化完成");
    }
    
    /**
     * 初始化音频源映射
     */
    private initializeAudioSources(): void {
        this._audioSources.set(AudioType.BGM, this.bgmSource);
        this._audioSources.set(AudioType.SFX, this.sfxSource);
        this._audioSources.set(AudioType.VOICE, this.voiceSource);
        this._audioSources.set(AudioType.AMBIENT, this.ambientSource);
        
        console.log("音频源映射初始化完成");
    }
    
    /**
     * 初始化音频数据
     */
    private initializeAudioData(): void {
        // 背景音乐
        this.addAudioData("bgm_main_menu", {
            id: "bgm_main_menu",
            audioType: AudioType.BGM,
            priority: AudioPriority.HIGH,
            volume: 0.8,
            loop: true,
            fadeIn: true,
            fadeOut: true,
            fadeTime: 2.0,
            maxInstances: 1,
            currentInstances: 0
        });
        
        this.addAudioData("bgm_tower_defense", {
            id: "bgm_tower_defense",
            audioType: AudioType.BGM,
            priority: AudioPriority.HIGH,
            volume: 0.8,
            loop: true,
            fadeIn: true,
            fadeOut: true,
            fadeTime: 2.0,
            maxInstances: 1,
            currentInstances: 0
        });
        
        this.addAudioData("bgm_roguelike", {
            id: "bgm_roguelike",
            audioType: AudioType.BGM,
            priority: AudioPriority.HIGH,
            volume: 0.8,
            loop: true,
            fadeIn: true,
            fadeOut: true,
            fadeTime: 2.0,
            maxInstances: 1,
            currentInstances: 0
        });
        
        // 音效
        this.addAudioData("sfx_button_click", {
            id: "sfx_button_click",
            audioType: AudioType.SFX,
            priority: AudioPriority.NORMAL,
            volume: 0.7,
            loop: false,
            fadeIn: false,
            fadeOut: false,
            fadeTime: 0.1,
            maxInstances: 5,
            currentInstances: 0
        });
        
        this.addAudioData("sfx_tower_build", {
            id: "sfx_tower_build",
            audioType: AudioType.SFX,
            priority: AudioPriority.NORMAL,
            volume: 0.8,
            loop: false,
            fadeIn: false,
            fadeOut: false,
            fadeTime: 0.1,
            maxInstances: 3,
            currentInstances: 0
        });
        
        this.addAudioData("sfx_tower_attack", {
            id: "sfx_tower_attack",
            audioType: AudioType.SFX,
            priority: AudioPriority.NORMAL,
            volume: 0.6,
            loop: false,
            fadeIn: false,
            fadeOut: false,
            fadeTime: 0.1,
            maxInstances: 10,
            currentInstances: 0
        });
        
        this.addAudioData("sfx_enemy_death", {
            id: "sfx_enemy_death",
            audioType: AudioType.SFX,
            priority: AudioPriority.NORMAL,
            volume: 0.5,
            loop: false,
            fadeIn: false,
            fadeOut: false,
            fadeTime: 0.1,
            maxInstances: 8,
            currentInstances: 0
        });
        
        this.addAudioData("sfx_item_pickup", {
            id: "sfx_item_pickup",
            audioType: AudioType.SFX,
            priority: AudioPriority.NORMAL,
            volume: 0.6,
            loop: false,
            fadeIn: false,
            fadeOut: false,
            fadeTime: 0.1,
            maxInstances: 5,
            currentInstances: 0
        });
        
        // 环境音
        this.addAudioData("ambient_wind", {
            id: "ambient_wind",
            audioType: AudioType.AMBIENT,
            priority: AudioPriority.LOW,
            volume: 0.3,
            loop: true,
            fadeIn: true,
            fadeOut: true,
            fadeTime: 3.0,
            maxInstances: 1,
            currentInstances: 0
        });
        
        console.log(`初始化了 ${this._audioData.size} 个音频数据`);
    }
    
    /**
     * 添加音频数据
     */
    private addAudioData(id: string, data: IAudioData): void {
        this._audioData.set(id, data);
    }
    
    /**
     * 播放音频
     */
    public playAudio(audioId: string, volume?: number): boolean {
        const audioData = this._audioData.get(audioId);
        if (!audioData) {
            console.error(`音频数据不存在: ${audioId}`);
            return false;
        }
        
        // 检查最大实例数
        if (audioData.currentInstances >= audioData.maxInstances) {
            console.warn(`音频实例数已达上限: ${audioId}`);
            return false;
        }
        
        // 获取音频源
        const audioSource = this._audioSources.get(audioData.audioType);
        if (!audioSource) {
            console.error(`音频源不存在: ${audioData.audioType}`);
            return false;
        }
        
        // 查找音频剪辑
        const audioClip = this.findAudioClip(audioId);
        if (!audioClip) {
            console.error(`音频剪辑不存在: ${audioId}`);
            return false;
        }
        
        // 设置音频属性
        audioSource.clip = audioClip;
        audioSource.volume = this.calculateFinalVolume(audioData, volume);
        audioSource.loop = audioData.loop;
        
        // 播放音频
        if (audioData.fadeIn) {
            this.playWithFadeIn(audioSource, audioData);
        } else {
            audioSource.play();
        }
        
        // 更新实例数
        audioData.currentInstances++;
        
        // 记录播放的音频
        this._playingAudio.set(audioId, audioSource);
        
        console.log(`播放音频: ${audioId}`);
        return true;
    }
    
    /**
     * 停止音频
     */
    public stopAudio(audioId: string, immediate: boolean = false): boolean {
        const audioData = this._audioData.get(audioId);
        if (!audioData) {
            console.warn(`音频数据不存在: ${audioId}`);
            return false;
        }
        
        const audioSource = this._playingAudio.get(audioId);
        if (!audioSource) {
            console.warn(`音频未在播放: ${audioId}`);
            return false;
        }
        
        if (audioData.fadeOut && !immediate) {
            this.stopWithFadeOut(audioSource, audioData);
        } else {
            audioSource.stop();
        }
        
        // 更新实例数
        audioData.currentInstances = Math.max(0, audioData.currentInstances - 1);
        
        // 移除播放记录
        this._playingAudio.delete(audioId);
        
        console.log(`停止音频: ${audioId}`);
        return true;
    }
    
    /**
     * 暂停音频
     */
    public pauseAudio(audioId: string): boolean {
        const audioSource = this._playingAudio.get(audioId);
        if (!audioSource) {
            console.warn(`音频未在播放: ${audioId}`);
            return false;
        }
        
        audioSource.pause();
        console.log(`暂停音频: ${audioId}`);
        return true;
    }
    
    /**
     * 恢复音频
     */
    public resumeAudio(audioId: string): boolean {
        const audioSource = this._playingAudio.get(audioId);
        if (!audioSource) {
            console.warn(`音频未在播放: ${audioId}`);
            return false;
        }
        
        audioSource.play();
        console.log(`恢复音频: ${audioId}`);
        return true;
    }
    
    /**
     * 停止所有音频
     */
    public stopAllAudio(audioType?: AudioType): void {
        if (audioType !== undefined) {
            // 停止指定类型的音频
            const audioSource = this._audioSources.get(audioType);
            if (audioSource) {
                audioSource.stop();
            }
            
            // 更新实例数
            for (const audioData of this._audioData.values()) {
                if (audioData.audioType === audioType) {
                    audioData.currentInstances = 0;
                }
            }
        } else {
            // 停止所有音频
            for (const audioSource of this._audioSources.values()) {
                if (audioSource) {
                    audioSource.stop();
                }
            }
            
            // 重置所有实例数
            for (const audioData of this._audioData.values()) {
                audioData.currentInstances = 0;
            }
        }
        
        this._playingAudio.clear();
        console.log("停止所有音频");
    }
    
    /**
     * 淡入播放
     */
    private playWithFadeIn(audioSource: AudioSource, audioData: IAudioData): void {
        audioSource.volume = 0;
        audioSource.play();
        
        // 淡入效果
        this.schedule(() => {
            const targetVolume = this.calculateFinalVolume(audioData);
            const fadeStep = targetVolume / (audioData.fadeTime * 60); // 假设60FPS
            
            if (audioSource.volume < targetVolume) {
                audioSource.volume = Math.min(audioSource.volume + fadeStep, targetVolume);
            } else {
                this.unschedule(this.playWithFadeIn);
            }
        }, 1/60);
    }
    
    /**
     * 淡出停止
     */
    private stopWithFadeOut(audioSource: AudioSource, audioData: IAudioData): void {
        const initialVolume = audioSource.volume;
        const fadeStep = initialVolume / (audioData.fadeTime * 60);
        
        this.schedule(() => {
            if (audioSource.volume > 0) {
                audioSource.volume = Math.max(audioSource.volume - fadeStep, 0);
            } else {
                audioSource.stop();
                this.unschedule(this.stopWithFadeOut);
            }
        }, 1/60);
    }
    
    /**
     * 查找音频剪辑
     */
    private findAudioClip(audioId: string): AudioClip | null {
        // 这里应该根据音频ID查找对应的AudioClip
        // 暂时返回null，实际实现中需要建立映射关系
        console.log(`查找音频剪辑: ${audioId}`);
        return null;
    }
    
    /**
     * 计算最终音量
     */
    private calculateFinalVolume(audioData: IAudioData, customVolume?: number): number {
        if (this._isMuted) return 0;
        
        const baseVolume = customVolume !== undefined ? customVolume : audioData.volume;
        const typeVolume = this.getTypeVolume(audioData.audioType);
        
        return baseVolume * typeVolume * this._masterVolume;
    }
    
    /**
     * 获取类型音量
     */
    private getTypeVolume(audioType: AudioType): number {
        switch (audioType) {
            case AudioType.BGM:
                return this._bgmVolume;
            case AudioType.SFX:
                return this._sfxVolume;
            case AudioType.VOICE:
                return this._voiceVolume;
            case AudioType.AMBIENT:
                return this._ambientVolume;
            default:
                return 1.0;
        }
    }
    
    /**
     * 设置主音量
     */
    public setMasterVolume(volume: number): void {
        this._masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
        console.log(`主音量设置为: ${this._masterVolume}`);
    }
    
    /**
     * 设置BGM音量
     */
    public setBGMVolume(volume: number): void {
        this._bgmVolume = Math.max(0, Math.min(1, volume));
        this.updateTypeVolumes(AudioType.BGM);
        console.log(`BGM音量设置为: ${this._bgmVolume}`);
    }
    
    /**
     * 设置音效音量
     */
    public setSFXVolume(volume: number): void {
        this._sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateTypeVolumes(AudioType.SFX);
        console.log(`音效音量设置为: ${this._sfxVolume}`);
    }
    
    /**
     * 设置语音音量
     */
    public setVoiceVolume(volume: number): void {
        this._voiceVolume = Math.max(0, Math.min(1, volume));
        this.updateTypeVolumes(AudioType.VOICE);
        console.log(`语音音量设置为: ${this._voiceVolume}`);
    }
    
    /**
     * 设置环境音音量
     */
    public setAmbientVolume(volume: number): void {
        this._ambientVolume = Math.max(0, Math.min(1, volume));
        this.updateTypeVolumes(AudioType.AMBIENT);
        console.log(`环境音音量设置为: ${this._ambientVolume}`);
    }
    
    /**
     * 更新所有音量
     */
    private updateAllVolumes(): void {
        for (const audioType of this._audioSources.keys()) {
            this.updateTypeVolumes(audioType);
        }
    }
    
    /**
     * 更新指定类型的音量
     */
    private updateTypeVolumes(audioType: AudioType): void {
        const audioSource = this._audioSources.get(audioType);
        if (!audioSource) return;
        
        const typeVolume = this.getTypeVolume(audioType);
        audioSource.volume = typeVolume * this._masterVolume;
    }
    
    /**
     * 静音/取消静音
     */
    public toggleMute(): void {
        this._isMuted = !this._isMuted;
        this.updateAllVolumes();
        console.log(`静音状态: ${this._isMuted}`);
    }
    
    /**
     * 设置静音
     */
    public setMute(muted: boolean): void {
        this._isMuted = muted;
        this.updateAllVolumes();
        console.log(`静音状态设置为: ${this._isMuted}`);
    }
    
    /**
     * 播放背景音乐
     */
    public playBGM(bgmId: string): void {
        // 停止当前BGM
        this.stopAllAudio(AudioType.BGM);
        
        // 播放新BGM
        this.playAudio(bgmId);
    }
    
    /**
     * 播放音效
     */
    public playSFX(sfxId: string, volume?: number): void {
        this.playAudio(sfxId, volume);
    }
    
    /**
     * 播放环境音
     */
    public playAmbient(ambientId: string): void {
        // 停止当前环境音
        this.stopAllAudio(AudioType.AMBIENT);
        
        // 播放新环境音
        this.playAudio(ambientId);
    }
    
    /**
     * 获取主音量
     */
    public getMasterVolume(): number {
        return this._masterVolume;
    }
    
    /**
     * 获取BGM音量
     */
    public getBGMVolume(): number {
        return this._bgmVolume;
    }
    
    /**
     * 获取音效音量
     */
    public getSFXVolume(): number {
        return this._sfxVolume;
    }
    
    /**
     * 获取语音音量
     */
    public getVoiceVolume(): number {
        return this._voiceVolume;
    }
    
    /**
     * 获取环境音音量
     */
    public getAmbientVolume(): number {
        return this._ambientVolume;
    }
    
    /**
     * 检查是否静音
     */
    public isMuted(): boolean {
        return this._isMuted;
    }
    
    /**
     * 检查音频是否在播放
     */
    public isAudioPlaying(audioId: string): boolean {
        return this._playingAudio.has(audioId);
    }
    
    /**
     * 获取播放中的音频列表
     */
    public getPlayingAudio(): string[] {
        return Array.from(this._playingAudio.keys());
    }
    
    onDestroy() {
        if (AudioManager._instance === this) {
            AudioManager._instance = null;
        }
    }
}
