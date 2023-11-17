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
        this.isLeaf = true;

        // Check if item is disabled. So not clickable
        // should be true for spaces and lists
        this.disabled = false;
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

        if (!this.children){
            this.children = [];
        }

        this.children.push(child);
        this.isLeaf = false;
    }
}