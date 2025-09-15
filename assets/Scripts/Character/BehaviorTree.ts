import { _decorator } from 'cc';
import { logger, LogCategory } from '../Core/Logger';

/**
 * 行为树节点状态枚举
 */
export enum BehaviorStatus {
    /** 成功 */
    SUCCESS = 'success',
    /** 失败 */
    FAILURE = 'failure',
    /** 运行中 */
    RUNNING = 'running',
    /** 未初始化 */
    INVALID = 'invalid'
}

/**
 * 行为树节点基类
 */
export abstract class BehaviorNode {
    /** 节点名称 */
    protected _name: string;
    /** 节点状态 */
    protected _status: BehaviorStatus = BehaviorStatus.INVALID;
    /** 父节点 */
    protected _parent: BehaviorNode = null;
    /** 调试模式 */
    protected _debug: boolean = false;
    
    /**
     * 构造函数
     * @param name 节点名称
     */
    constructor(name: string) {
        this._name = name;
    }
    
    /**
     * 执行节点
     * @param blackboard 黑板数据
     */
    public abstract execute(blackboard: Blackboard): BehaviorStatus;
    
    /**
     * 重置节点状态
     */
    public reset(): void {
        this._status = BehaviorStatus.INVALID;
    }
    
    /**
     * 获取节点名称
     */
    public getName(): string {
        return this._name;
    }
    
    /**
     * 获取节点状态
     */
    public getStatus(): BehaviorStatus {
        return this._status;
    }
    
    /**
     * 设置父节点
     * @param parent 父节点
     */
    public setParent(parent: BehaviorNode): void {
        this._parent = parent;
    }
    
    /**
     * 获取父节点
     */
    public getParent(): BehaviorNode {
        return this._parent;
    }
    
    /**
     * 设置调试模式
     * @param debug 是否启用调试
     */
    public setDebug(debug: boolean): void {
        this._debug = debug;
    }
    
    /**
     * 输出调试信息
     * @param message 调试信息
     */
    protected _debugLog(message: string): void {
        if (this._debug) {
            logger.debug(LogCategory.AI, `[${this._name}] ${message}`);
        }
    }
}

/**
 * 复合节点基类
 * 复合节点可以包含多个子节点
 */
export abstract class CompositeNode extends BehaviorNode {
    /** 子节点列表 */
    protected _children: BehaviorNode[] = [];
    
    /**
     * 添加子节点
     * @param child 子节点
     */
    public addChild(child: BehaviorNode): void {
        this._children.push(child);
        child.setParent(this);
    }
    
    /**
     * 获取子节点列表
     */
    public getChildren(): BehaviorNode[] {
        return this._children;
    }
    
    /**
     * 重置节点状态
     */
    public reset(): void {
        super.reset();
        
        // 重置所有子节点
        for (const child of this._children) {
            child.reset();
        }
    }
}

/**
 * 装饰器节点基类
 * 装饰器节点只有一个子节点，用于修改子节点的行为
 */
export abstract class DecoratorNode extends BehaviorNode {
    /** 子节点 */
    protected _child: BehaviorNode = null;
    
    /**
     * 设置子节点
     * @param child 子节点
     */
    public setChild(child: BehaviorNode): void {
        this._child = child;
        child.setParent(this);
    }
    
    /**
     * 获取子节点
     */
    public getChild(): BehaviorNode {
        return this._child;
    }
    
    /**
     * 重置节点状态
     */
    public reset(): void {
        super.reset();
        
        // 重置子节点
        if (this._child) {
            this._child.reset();
        }
    }
}

/**
 * 顺序节点
 * 按顺序执行子节点，直到一个子节点返回失败或运行中，或者所有子节点都成功
 */
export class SequenceNode extends CompositeNode {
    /** 当前执行的子节点索引 */
    private _currentIndex: number = 0;
    
    /**
     * 执行节点
     * @param blackboard 黑板数据
     */
    public execute(blackboard: Blackboard): BehaviorStatus {
        // 如果没有子节点，则返回成功
        if (this._children.length === 0) {
            this._status = BehaviorStatus.SUCCESS;
            return this._status;
        }
        
        // 从当前索引开始执行子节点
        while (this._currentIndex < this._children.length) {
            const child = this._children[this._currentIndex];
            const status = child.execute(blackboard);
            
            // 如果子节点返回失败或运行中，则返回相同状态
            if (status === BehaviorStatus.FAILURE || status === BehaviorStatus.RUNNING) {
                this._status = status;
                return this._status;
            }
            
            // 如果子节点成功，则继续执行下一个子节点
            this._currentIndex++;
        }
        
        // 所有子节点都成功，重置索引并返回成功
        this._currentIndex = 0;
        this._status = BehaviorStatus.SUCCESS;
        return this._status;
    }
    
    /**
     * 重置节点状态
     */
    public reset(): void {
        super.reset();
        this._currentIndex = 0;
    }
}

/**
 * 选择节点
 * 按顺序执行子节点，直到一个子节点返回成功或运行中，或者所有子节点都失败
 */
export class SelectorNode extends CompositeNode {
    /** 当前执行的子节点索引 */
    private _currentIndex: number = 0;
    
    /**
     * 执行节点
     * @param blackboard 黑板数据
     */
    public execute(blackboard: Blackboard): BehaviorStatus {
        // 如果没有子节点，则返回失败
        if (this._children.length === 0) {
            this._status = BehaviorStatus.FAILURE;
            return this._status;
        }
        
        // 从当前索引开始执行子节点
        while (this._currentIndex < this._children.length) {
            const child = this._children[this._currentIndex];
            const status = child.execute(blackboard);
            
            // 如果子节点返回成功或运行中，则返回相同状态
            if (status === BehaviorStatus.SUCCESS || status === BehaviorStatus.RUNNING) {
                this._status = status;
                return this._status;
            }
            
            // 如果子节点失败，则继续执行下一个子节点
            this._currentIndex++;
        }
        
        // 所有子节点都失败，重置索引并返回失败
        this._currentIndex = 0;
        this._status = BehaviorStatus.FAILURE;
        return this._status;
    }
    
    /**
     * 重置节点状态
     */
    public reset(): void {
        super.reset();
        this._currentIndex = 0;
    }
}

/**
 * 并行节点
 * 同时执行所有子节点，根据策略决定返回状态
 */
export class ParallelNode extends CompositeNode {
    /** 成功策略：需要多少个子节点成功才算成功 */
    private _successPolicy: number;
    /** 失败策略：需要多少个子节点失败才算失败 */
    private _failurePolicy: number;
    
    /**
     * 构造函数
     * @param name 节点名称
     * @param successPolicy 成功策略（需要多少个子节点成功才算成功，默认为所有子节点）
     * @param failurePolicy 失败策略（需要多少个子节点失败才算失败，默认为1个子节点）
     */
    constructor(name: string, successPolicy: number = -1, failurePolicy: number = 1) {
        super(name);
        this._successPolicy = successPolicy;
        this._failurePolicy = failurePolicy;
    }
    
    /**
     * 执行节点
     * @param blackboard 黑板数据
     */
    public execute(blackboard: Blackboard): BehaviorStatus {
        // 如果没有子节点，则返回成功
        if (this._children.length === 0) {
            this._status = BehaviorStatus.SUCCESS;
            return this._status;
        }
        
        let successCount = 0;
        let failureCount = 0;
        let runningCount = 0;
        
        // 执行所有子节点
        for (const child of this._children) {
            const status = child.execute(blackboard);
            
            if (status === BehaviorStatus.SUCCESS) {
                successCount++;
            } else if (status === BehaviorStatus.FAILURE) {
                failureCount++;
            } else if (status === BehaviorStatus.RUNNING) {
                runningCount++;
            }
        }
        
        // 检查失败策略
        if (this._failurePolicy > 0 && failureCount >= this._failurePolicy) {
            this._status = BehaviorStatus.FAILURE;
            return this._status;
        }
        
        // 检查成功策略
        const requiredSuccessCount = this._successPolicy > 0 ? this._successPolicy : this._children.length;
        if (successCount >= requiredSuccessCount) {
            this._status = BehaviorStatus.SUCCESS;
            return this._status;
        }
        
        // 如果有子节点正在运行，则返回运行中
        if (runningCount > 0) {
            this._status = BehaviorStatus.RUNNING;
            return this._status;
        }
        
        // 默认返回失败
        this._status = BehaviorStatus.FAILURE;
        return this._status;
    }
}

/**
 * 条件节点
 * 执行条件检查，根据条件返回成功或失败
 */
export class ConditionNode extends BehaviorNode {
    /** 条件检查函数 */
    private _condition: (blackboard: Blackboard) => boolean;
    
    /**
     * 构造函数
     * @param name 节点名称
     * @param condition 条件检查函数
     */
    constructor(name: string, condition: (blackboard: Blackboard) => boolean) {
        super(name);
        this._condition = condition;
    }
    
    /**
     * 执行节点
     * @param blackboard 黑板数据
     */
    public execute(blackboard: Blackboard): BehaviorStatus {
        // 执行条件检查
        const result = this._condition(blackboard);
        
        // 根据条件结果返回状态
        this._status = result ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
        
        this._debugLog(`条件检查结果: ${result}`);
        
        return this._status;
    }
}

/**
 * 动作节点
 * 执行具体的动作
 */
export class ActionNode extends BehaviorNode {
    /** 动作执行函数 */
    private _action: (blackboard: Blackboard) => BehaviorStatus;
    
    /**
     * 构造函数
     * @param name 节点名称
     * @param action 动作执行函数
     */
    constructor(name: string, action: (blackboard: Blackboard) => BehaviorStatus) {
        super(name);
        this._action = action;
    }
    
    /**
     * 执行节点
     * @param blackboard 黑板数据
     */
    public execute(blackboard: Blackboard): BehaviorStatus {
        // 执行动作
        this._status = this._action(blackboard);
        
        this._debugLog(`动作执行结果: ${this._status}`);
        
        return this._status;
    }
}

/**
 * 反转节点
 * 反转子节点的结果（成功变为失败，失败变为成功）
 */
export class InverterNode extends DecoratorNode {
    /**
     * 执行节点
     * @param blackboard 黑板数据
     */
    public execute(blackboard: Blackboard): BehaviorStatus {
        // 如果没有子节点，则返回失败
        if (!this._child) {
            this._status = BehaviorStatus.FAILURE;
            return this._status;
        }
        
        // 执行子节点
        const childStatus = this._child.execute(blackboard);
        
        // 反转结果
        if (childStatus === BehaviorStatus.SUCCESS) {
            this._status = BehaviorStatus.FAILURE;
        } else if (childStatus === BehaviorStatus.FAILURE) {
            this._status = BehaviorStatus.SUCCESS;
        } else {
            this._status = childStatus;
        }
        
        return this._status;
    }
}

/**
 * 重复节点
 * 重复执行子节点指定次数
 */
export class RepeatNode extends DecoratorNode {
    /** 重复次数 */
    private _repeatCount: number;
    /** 当前执行次数 */
    private _currentCount: number = 0;
    /** 是否无限重复 */
    private _isInfinite: boolean;
    
    /**
     * 构造函数
     * @param name 节点名称
     * @param repeatCount 重复次数（-1表示无限重复）
     */
    constructor(name: string, repeatCount: number = -1) {
        super(name);
        this._repeatCount = repeatCount;
        this._isInfinite = repeatCount < 0;
    }
    
    /**
     * 执行节点
     * @param blackboard 黑板数据
     */
    public execute(blackboard: Blackboard): BehaviorStatus {
        // 如果没有子节点，则返回失败
        if (!this._child) {
            this._status = BehaviorStatus.FAILURE;
            return this._status;
        }
        
        // 如果是无限重复或者未达到重复次数
        if (this._isInfinite || this._currentCount < this._repeatCount) {
            // 执行子节点
            const childStatus = this._child.execute(blackboard);
            
            // 如果子节点正在运行，则返回运行中
            if (childStatus === BehaviorStatus.RUNNING) {
                this._status = BehaviorStatus.RUNNING;
                return this._status;
            }
            
            // 如果子节点完成（成功或失败），则增加计数
            if (!this._isInfinite) {
                this._currentCount++;
            }
            
            // 如果未达到重复次数，则重置子节点并返回运行中
            if (this._isInfinite || this._currentCount < this._repeatCount) {
                this._child.reset();
                this._status = BehaviorStatus.RUNNING;
                return this._status;
            }
        }
        
        // 达到重复次数，重置计数并返回成功
        this._currentCount = 0;
        this._status = BehaviorStatus.SUCCESS;
        return this._status;
    }
    
    /**
     * 重置节点状态
     */
    public reset(): void {
        super.reset();
        this._currentCount = 0;
    }
}

/**
 * 直到成功节点
 * 重复执行子节点直到成功
 */
export class UntilSuccessNode extends DecoratorNode {
    /**
     * 执行节点
     * @param blackboard 黑板数据
     */
    public execute(blackboard: Blackboard): BehaviorStatus {
        // 如果没有子节点，则返回失败
        if (!this._child) {
            this._status = BehaviorStatus.FAILURE;
            return this._status;
        }
        
        // 执行子节点
        const childStatus = this._child.execute(blackboard);
        
        // 如果子节点成功，则返回成功
        if (childStatus === BehaviorStatus.SUCCESS) {
            this._status = BehaviorStatus.SUCCESS;
            return this._status;
        }
        
        // 如果子节点正在运行，则返回运行中
        if (childStatus === BehaviorStatus.RUNNING) {
            this._status = BehaviorStatus.RUNNING;
            return this._status;
        }
        
        // 如果子节点失败，则重置子节点并返回运行中
        this._child.reset();
        this._status = BehaviorStatus.RUNNING;
        return this._status;
    }
}

/**
 * 直到失败节点
 * 重复执行子节点直到失败
 */
export class UntilFailureNode extends DecoratorNode {
    /**
     * 执行节点
     * @param blackboard 黑板数据
     */
    public execute(blackboard: Blackboard): BehaviorStatus {
        // 如果没有子节点，则返回失败
        if (!this._child) {
            this._status = BehaviorStatus.FAILURE;
            return this._status;
        }
        
        // 执行子节点
        const childStatus = this._child.execute(blackboard);
        
        // 如果子节点失败，则返回成功
        if (childStatus === BehaviorStatus.FAILURE) {
            this._status = BehaviorStatus.SUCCESS;
            return this._status;
        }
        
        // 如果子节点正在运行，则返回运行中
        if (childStatus === BehaviorStatus.RUNNING) {
            this._status = BehaviorStatus.RUNNING;
            return this._status;
        }
        
        // 如果子节点成功，则重置子节点并返回运行中
        this._child.reset();
        this._status = BehaviorStatus.RUNNING;
        return this._status;
    }
}

/**
 * 黑板类
 * 用于存储和共享行为树节点之间的数据
 */
export class Blackboard {
    /** 数据映射表 */
    private _data: Map<string, any> = new Map();
    
    /**
     * 设置数据
     * @param key 键
     * @param value 值
     */
    public set(key: string, value: any): void {
        this._data.set(key, value);
    }
    
    /**
     * 获取数据
     * @param key 键
     * @param defaultValue 默认值
     */
    public get<T>(key: string, defaultValue?: T): T {
        if (this._data.has(key)) {
            return this._data.get(key) as T;
        }
        return defaultValue;
    }
    
    /**
     * 检查是否存在数据
     * @param key 键
     */
    public has(key: string): boolean {
        return this._data.has(key);
    }
    
    /**
     * 删除数据
     * @param key 键
     */
    public delete(key: string): boolean {
        return this._data.delete(key);
    }
    
    /**
     * 清空所有数据
     */
    public clear(): void {
        this._data.clear();
    }
}

/**
 * 行为树类
 * 用于管理和执行行为树
 */
export class BehaviorTree {
    /** 根节点 */
    private _root: BehaviorNode = null;
    /** 黑板 */
    private _blackboard: Blackboard = new Blackboard();
    /** 是否启用 */
    private _enabled: boolean = true;
    /** 调试模式 */
    private _debug: boolean = false;
    /** 名称 */
    private _name: string;
    
    /**
     * 构造函数
     * @param name 行为树名称
     * @param root 根节点
     */
    constructor(name: string, root?: BehaviorNode) {
        this._name = name;
        this._root = root;
    }
    
    /**
     * 设置根节点
     * @param root 根节点
     */
    public setRoot(root: BehaviorNode): void {
        this._root = root;
    }
    
    /**
     * 获取根节点
     */
    public getRoot(): BehaviorNode {
        return this._root;
    }
    
    /**
     * 获取黑板
     */
    public getBlackboard(): Blackboard {
        return this._blackboard;
    }
    
    /**
     * 设置是否启用
     * @param enabled 是否启用
     */
    public setEnabled(enabled: boolean): void {
        this._enabled = enabled;
    }
    
    /**
     * 是否启用
     */
    public isEnabled(): boolean {
        return this._enabled;
    }
    
    /**
     * 设置调试模式
     * @param debug 是否启用调试
     */
    public setDebug(debug: boolean): void {
        this._debug = debug;
        
        // 递归设置所有节点的调试模式
        this._setNodeDebug(this._root, debug);
    }
    
    /**
     * 递归设置节点调试模式
     * @param node 节点
     * @param debug 是否启用调试
     */
    private _setNodeDebug(node: BehaviorNode, debug: boolean): void {
        if (!node) {
            return;
        }
        
        node.setDebug(debug);
        
        // 设置复合节点的子节点
        if (node instanceof CompositeNode) {
            for (const child of node.getChildren()) {
                this._setNodeDebug(child, debug);
            }
        }
        // 设置装饰器节点的子节点
        else if (node instanceof DecoratorNode) {
            this._setNodeDebug(node.getChild(), debug);
        }
    }
    
    /**
     * 执行行为树
     */
    public execute(): BehaviorStatus {
        // 如果未启用或没有根节点，则返回失败
        if (!this._enabled || !this._root) {
            return BehaviorStatus.FAILURE;
        }
        
        // 执行根节点
        const status = this._root.execute(this._blackboard);
        
        if (this._debug) {
            logger.debug(LogCategory.AI, `行为树[${this._name}]执行结果: ${status}`);
        }
        
        return status;
    }
    
    /**
     * 重置行为树
     */
    public reset(): void {
        if (this._root) {
            this._root.reset();
        }
    }
}

/**
 * 行为树构建器
 * 用于简化行为树的创建过程
 */
export class BehaviorTreeBuilder {
    /** 当前节点 */
    private _currentNode: BehaviorNode = null;
    /** 节点栈 */
    private _nodeStack: BehaviorNode[] = [];
    /** 根节点 */
    private _root: BehaviorNode = null;
    
    /**
     * 创建顺序节点
     * @param name 节点名称
     */
    public sequence(name: string): BehaviorTreeBuilder {
        const node = new SequenceNode(name);
        this._addNode(node);
        this._pushNode(node);
        return this;
    }
    
    /**
     * 创建选择节点
     * @param name 节点名称
     */
    public selector(name: string): BehaviorTreeBuilder {
        const node = new SelectorNode(name);
        this._addNode(node);
        this._pushNode(node);
        return this;
    }
    
    /**
     * 创建并行节点
     * @param name 节点名称
     * @param successPolicy 成功策略
     * @param failurePolicy 失败策略
     */
    public parallel(name: string, successPolicy: number = -1, failurePolicy: number = 1): BehaviorTreeBuilder {
        const node = new ParallelNode(name, successPolicy, failurePolicy);
        this._addNode(node);
        this._pushNode(node);
        return this;
    }
    
    /**
     * 创建条件节点
     * @param name 节点名称
     * @param condition 条件检查函数
     */
    public condition(name: string, condition: (blackboard: Blackboard) => boolean): BehaviorTreeBuilder {
        const node = new ConditionNode(name, condition);
        this._addNode(node);
        return this;
    }
    
    /**
     * 创建动作节点
     * @param name 节点名称
     * @param action 动作执行函数
     */
    public action(name: string, action: (blackboard: Blackboard) => BehaviorStatus): BehaviorTreeBuilder {
        const node = new ActionNode(name, action);
        this._addNode(node);
        return this;
    }
    
    /**
     * 创建反转节点
     * @param name 节点名称
     */
    public inverter(name: string): BehaviorTreeBuilder {
        const node = new InverterNode(name);
        this._addNode(node);
        this._pushNode(node);
        return this;
    }
    
    /**
     * 创建重复节点
     * @param name 节点名称
     * @param repeatCount 重复次数
     */
    public repeat(name: string, repeatCount: number = -1): BehaviorTreeBuilder {
        const node = new RepeatNode(name, repeatCount);
        this._addNode(node);
        this._pushNode(node);
        return this;
    }
    
    /**
     * 创建直到成功节点
     * @param name 节点名称
     */
    public untilSuccess(name: string): BehaviorTreeBuilder {
        const node = new UntilSuccessNode(name);
        this._addNode(node);
        this._pushNode(node);
        return this;
    }
    
    /**
     * 创建直到失败节点
     * @param name 节点名称
     */
    public untilFailure(name: string): BehaviorTreeBuilder {
        const node = new UntilFailureNode(name);
        this._addNode(node);
        this._pushNode(node);
        return this;
    }
    
    /**
     * 结束当前复合节点或装饰器节点
     */
    public end(): BehaviorTreeBuilder {
        this._popNode();
        return this;
    }
    
    /**
     * 构建行为树
     * @param name 行为树名称
     */
    public build(name: string): BehaviorTree {
        // 确保所有节点都已结束
        if (this._nodeStack.length > 0) {
            logger.warn(LogCategory.AI, `构建行为树时存在未结束的节点: ${this._nodeStack.length}个`);
            this._nodeStack = [];
        }
        
        // 创建行为树
        return new BehaviorTree(name, this._root);
    }
    
    /**
     * 添加节点到当前节点
     * @param node 节点
     */
    private _addNode(node: BehaviorNode): void {
        // 如果没有当前节点，则设置为根节点
        if (!this._currentNode) {
            this._root = node;
            this._currentNode = node;
            return;
        }
        
        // 将节点添加到当前节点
        if (this._currentNode instanceof CompositeNode) {
            (this._currentNode as CompositeNode).addChild(node);
        } else if (this._currentNode instanceof DecoratorNode) {
            (this._currentNode as DecoratorNode).setChild(node);
        }
    }
    
    /**
     * 将节点压入栈
     * @param node 节点
     */
    private _pushNode(node: BehaviorNode): void {
        this._nodeStack.push(this._currentNode);
        this._currentNode = node;
    }
    
    /**
     * 从栈中弹出节点
     */
    private _popNode(): void {
        if (this._nodeStack.length > 0) {
            this._currentNode = this._nodeStack.pop();
        } else {
            this._currentNode = null;
        }
    }
}