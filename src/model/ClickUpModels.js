export const ClickUpType = {
    SPACE: "space",
    LIST: "list",
    TASK: "task",
    SUBTASK: "subtask",
}

export class ClickUpItem{
    constructor(id, name, type, children){
        if (!Object.values(ClickUpType).includes(type)){
            throw new Error("Invalid type");
        }

        if (children && !Array.isArray(children)){
            throw new Error("Children must be an array");
        }

        if (children && children.some(child => !(child instanceof ClickUpItem))){
            throw new Error("Children must be of type ClickUpItem");
        }

        this.id = id;
        this.key = id;

        this.name = name;
        this.label = name;

        this.type = type;
        this.children = children;

        this.isLeaf = false;

        /*
        switch (type){
            case ClickUpType.TASK:
                this.isLeaf = true;
                break;
            case ClickUpType.SUBTASK:
                this.isLeaf = true;
                break;
        }
         */
    }

    addChild(child){
        if (!(child instanceof ClickUpItem)){
            throw new Error("Child must be of type ClickUpItem");
        }

        this.children.push(child);
    }
}