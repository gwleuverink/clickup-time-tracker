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
                this.leaf = false;
                break;
            case ClickUpType.LIST:
                this.leaf = false;
                break;
            case ClickUpType.TASK:
                this.leaf = true;
                break;
            case ClickUpType.SUBTASK:
                this.leaf = true;
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
}