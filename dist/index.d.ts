import mongoose from 'mongoose';
export type FieldSelection = string | {
    [key: string]: 1 | 0;
};
export interface JoinConfig {
    collection: string;
    link: [string, string?];
    select?: FieldSelection;
}
export interface BaseMatchCondition {
    [key: string]: any;
}
export interface SortConfig {
    [key: string]: 1 | -1;
}
export interface GroupConfig {
    _id: any;
    [key: string]: any;
}
declare class AggregateBuilder<T> {
    private model;
    private pipeline;
    private hasGrouped;
    constructor(model: mongoose.Model<T>);
    join(config: JoinConfig): this;
    match<U extends BaseMatchCondition = BaseMatchCondition>(matchCondition: U): this;
    sort(config: SortConfig): this;
    limit(count: number): this;
    skip(count: number): this;
    group(config: GroupConfig): this;
    private parseFieldSelection;
    exec(): Promise<T[]>;
}
declare function aggregate<T>(model: mongoose.Model<T>): AggregateBuilder<T>;
export default aggregate;
