import mongoose from 'mongoose';
export type FieldSelection = string | {
    [key: string]: 1 | 0;
};
export interface JoinConfig {
    collection: string;
    link: [string, string?];
    select?: FieldSelection;
    populate?: boolean | 'string';
    preserveNullAndEmptyArrays?: boolean;
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
declare class Aggregate<T> {
    private model;
    private pipeline;
    private hasGrouped;
    constructor(model: mongoose.Model<T>);
    join(config: JoinConfig): this;
    isObjectId(schemaPath: mongoose.SchemaType | undefined): boolean;
    ensureIdIncluded(select: FieldSelection): FieldSelection;
    match<U extends BaseMatchCondition = BaseMatchCondition>(matchCondition: U): this;
    sort(config: SortConfig): this;
    limit(count: number): this;
    skip(count: number): this;
    group(config: GroupConfig): this;
    select(fields: FieldSelection): this;
    private parseFieldSelection;
    exec(): Promise<T[]>;
    count(as?: string): Promise<any>;
}
declare function aggregate<T>(model: mongoose.Model<T>): Aggregate<T>;
export default aggregate;
