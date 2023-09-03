export enum ClickUpType {
    SPACE = "space",
    LIST =  "list",
    TASK = "task",
    SUBTASK = "subtask",
}

export class ClickUpItem{
    id : number;
    key: number;

    name: string;
    label: string;

    type: ClickUpType;
    children: ClickUpItem[];

    constructor(id: number, name: string, type:ClickUpType, children: ClickUpItem[]){
        this.id = id;
        this.key = id;

        this.name = name;
        this.label = name;

        this.type = type;
        this.children = children;
    }

    addChild(child){
        if (!(child instanceof ClickUpItem)){
            throw new Error("Child must be of type ClickUpItem");
        }

        this.children.push(child);
    }
}