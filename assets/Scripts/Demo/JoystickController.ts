import { _decorator, Component, Node, EventTouch, UITransform, Vec2, Vec3, input, Input } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('JoystickController')
export class JoystickController extends Component {
    @property(Node)
    joystickBg: Node = null;

    @property(Node)
    joystickHandle: Node = null;

    @property
    maxRadius: number = 100;

    @property
    deadzone: number = 10;

    public moveDir: Vec2 = new Vec2(0, 0);
    private _isTouching: boolean = false;
    private _joystickBgPos: Vec3 = new Vec3();

    start() {
        // 初始化摇杆背景位置
        if (this.joystickBg) {
            this._joystickBgPos = this.joystickBg.position.clone();
        }

        // 注册触摸事件
        this.registerTouchEvents();
    }

    registerTouchEvents() {
        // 注册触摸开始事件
        this.node.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        // 注册触摸移动事件
        this.node.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        // 注册触摸结束事件
        this.node.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        // 注册触摸取消事件
        this.node.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onTouchStart(event: EventTouch) {
        this._isTouching = true;

        // 获取触摸点在UI坐标系中的位置
        const touchPos = event.getUILocation();
        const localPos = this.node.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));

        // 更新摇杆背景位置（可选，固定摇杆位置则注释此行）
        // this.joystickBg.position = localPos;

        // 更新摇杆手柄位置
        this.updateJoystickHandlePosition(localPos);
    }

    onTouchMove(event: EventTouch) {
        if (!this._isTouching) return;

        // 获取触摸点在UI坐标系中的位置
        const touchPos = event.getUILocation();
        const localPos = this.node.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));

        // 更新摇杆手柄位置
        this.updateJoystickHandlePosition(localPos);
    }

    onTouchEnd(event: EventTouch) {
        this._isTouching = false;

        // 重置摇杆手柄位置
        if (this.joystickHandle) {
            this.joystickHandle.position = new Vec3(0, 0, 0);
        }

        // 重置摇杆背景位置（如果之前移动过）
        if (this.joystickBg) {
            this.joystickBg.position = this._joystickBgPos;
        }

        // 重置移动方向
        this.moveDir.x = 0;
        this.moveDir.y = 0;
    }

    updateJoystickHandlePosition(touchPos: Vec3) {
        if (!this.joystickHandle || !this.joystickBg) return;

        // 计算触摸点相对于摇杆背景的偏移
        const bgPos = this.joystickBg.position;
        const direction = new Vec3(touchPos.x - bgPos.x, touchPos.y - bgPos.y, 0);
        const distance = direction.length();

        // 计算摇杆手柄位置
        if (distance > this.deadzone) {
            // 限制在最大半径内
            const finalDistance = Math.min(distance, this.maxRadius);
            const normalizedDir = direction.normalize();
            const handlePos = new Vec3(
                normalizedDir.x * finalDistance,
                normalizedDir.y * finalDistance,
                0
            );

            // 更新摇杆手柄位置
            this.joystickHandle.position = handlePos;

            // 计算并更新移动方向（归一化）
            this.moveDir.x = normalizedDir.x;
            this.moveDir.y = normalizedDir.y;
        } else {
            // 在死区内，不移动
            this.joystickHandle.position = new Vec3(0, 0, 0);
            this.moveDir.x = 0;
            this.moveDir.y = 0;
        }
    }

    onDestroy() {
        // 移除事件监听
        this.node.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
}