import { _decorator, Component, Node, Vec2, Vec3, RigidBody2D, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property
    moveSpeed: number = 200;

    @property(Node)
    joystick: Node = null;

    private _joystickCtrl: any = null;
    private _rigidbody: RigidBody2D = null;
    private _moveDir: Vec2 = new Vec2(0, 0);
    private _boundaries: { minX: number, maxX: number, minY: number, maxY: number } = null;

    start() {
        // 获取刚体组件
        this._rigidbody = this.getComponent(RigidBody2D);
        
        // 获取摇杆控制器
        if (this.joystick) {
            this._joystickCtrl = this.joystick.getComponent('JoystickController');
        }
        
        // 设置移动边界
        this.setupBoundaries();
    }

    setupBoundaries() {
        // 获取场景边界（可根据实际场景大小调整）
        const canvas = this.node.parent;
        if (canvas) {
            const canvasSize = canvas.getComponent(UITransform).contentSize;
            const playerSize = this.node.getComponent(UITransform).contentSize;
            
            this._boundaries = {
                minX: -canvasSize.width / 2 + playerSize.width / 2,
                maxX: canvasSize.width / 2 - playerSize.width / 2,
                minY: -canvasSize.height / 2 + playerSize.height / 2,
                maxY: canvasSize.height / 2 - playerSize.height / 2
            };
        }
    }

    update(deltaTime: number) {
        // 如果有摇杆控制器，获取移动方向
        if (this._joystickCtrl) {
            this._moveDir.x = this._joystickCtrl.moveDir.x;
            this._moveDir.y = this._joystickCtrl.moveDir.y;
        }
        
        // 移动角色
        this.movePlayer(deltaTime);
    }

    movePlayer(deltaTime: number) {
        if (this._moveDir.x === 0 && this._moveDir.y === 0) {
            return;
        }
        
        // 计算移动距离
        const moveX = this._moveDir.x * this.moveSpeed * deltaTime;
        const moveY = this._moveDir.y * this.moveSpeed * deltaTime;
        
        // 使用刚体移动或直接移动节点
        if (this._rigidbody) {
            // 使用刚体移动
            this._rigidbody.linearVelocity = new Vec2(
                this._moveDir.x * this.moveSpeed,
                this._moveDir.y * this.moveSpeed
            );
        } else {
            // 直接移动节点
            const newPos = new Vec3(
                this.node.position.x + moveX,
                this.node.position.y + moveY,
                0
            );
            
            // 边界检查
            if (this._boundaries) {
                newPos.x = Math.min(Math.max(newPos.x, this._boundaries.minX), this._boundaries.maxX);
                newPos.y = Math.min(Math.max(newPos.y, this._boundaries.minY), this._boundaries.maxY);
            }
            
            this.node.position = newPos;
        }
    }
}