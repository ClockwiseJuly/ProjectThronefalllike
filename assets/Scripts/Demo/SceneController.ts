import { _decorator, Component, Node, director, Button } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SceneController')
export class SceneController extends Component {
    @property(Button)
    startButton: Button = null;

    start() {
        // 注册开始按钮点击事件
        if (this.startButton) {
            this.startButton.node.on(Button.EventType.CLICK, this.onStartButtonClicked, this);
        }
    }

    onStartButtonClicked() {
        // 加载游戏场景
        director.loadScene('GameScene');
    }
}