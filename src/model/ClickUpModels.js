export const ClickUpType = {
    SPACE: "space",
    LIST: "list",
    TASK: "task",
    SUBTASK: "subtask",
}

export class ClickUpItem{
    constructor(id, name, type){
        if (!Object.values(ClickUpType).includes(type)){
            throw new Error("Invalid type");
        }

        this.id = id;
        this.value = id;

        this.name = name;
        this.label = name;

        this.type = type;

        switch (this.type){
            case ClickUpType.SPACE:
                this.disable = true;
                break;
            case ClickUpType.LIST:
                this.disable = true;
                break;
            case ClickUpType.TASK:
                this.disable = false;
                break;
            case ClickUpType.SUBTASK:
                this.disable = false;
                break;
        }
    }

    addChild(child){
        if (!(child instanceof ClickUpItem)){
            throw new Error("Child must be of type ClickUpItem");
        }
        if (!this.children){
            this.children = [];
        }
        this.children.push(child);
    }

    addChildren(children){
        if (!Array.isArray(children)){
            throw new Error("Children must be an array");
        }
        children.forEach(child => this.addChild(child));
    }
}