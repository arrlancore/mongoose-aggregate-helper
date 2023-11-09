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
    /**
     *
     * @param config
     * if config.link[0] start with # we will convert it to be objectId
     * @returns
     */
    join(config: JoinConfig): this;
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
    get aggregatePipeline(): mongoose.PipelineStage[];
}
declare function aggregate<T>(model: mongoose.Model<T>): Aggregate<T>;
export default aggregate;
