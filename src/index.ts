import mongoose, { PipelineStage } from 'mongoose';

export type FieldSelection = string | { [key: string]: 1 | 0 };

// Define the configuration object for the join operation
export interface JoinConfig {
  collection: string;
  link: [string, string?]; // Tuple with local and optional foreign field
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

class AggregateBuilder<T> {
  private model: mongoose.Model<T>;
  private pipeline: PipelineStage[] = [];
  private hasGrouped: boolean = false;

  constructor(model: mongoose.Model<T>) {
    this.model = model;
  }

  join(config: JoinConfig): this {
    if (typeof config.collection !== 'string') {
      throw new TypeError('Collection name must be a string. Received: ' + config.collection);
    }
    if (!Array.isArray(config.link) || !config.link.every((field) => typeof field === 'string')) {
      throw new TypeError('Link must be an array of strings.');
    }
    if (config.select && typeof config.select !== 'string' && typeof config.select !== 'object') {
      throw new TypeError('Select must be a string or an object.');
    }

    const localField = config.link[0];
    const foreignField = config.link[1] || '_id';
    const as = `${config.collection}Details`;

    // Construct the $lookup stage
    const lookupStage = {
      $lookup: {
        from: config.collection,
        let: { localId: `$${localField}` },
        pipeline: [
          { $match: { $expr: { $eq: [`$${foreignField}`, `$$localId`] } } },
          { $project: this.parseFieldSelection(config.select) },
        ],
        as,
      },
    };

    this.pipeline.push(lookupStage);
    return this;
  }

  // Allow the user to specify the type for the match condition
  match<U extends BaseMatchCondition = BaseMatchCondition>(matchCondition: U) {
    // Add the match condition to the pipeline
    this.pipeline.push({ $match: matchCondition });
    return this;
  }

  sort(config: SortConfig): this {
    this.pipeline.push({ $sort: config });
    return this;
  }

  limit(count: number): this {
    this.pipeline.push({ $limit: count });
    return this;
  }

  skip(count: number): this {
    this.pipeline.push({ $skip: count });
    return this;
  }

  group(config: GroupConfig): this {
    if (this.hasGrouped) {
      throw new Error('Cannot call group again after a grouping operation.');
    }
    this.hasGrouped = true;

    this.pipeline.push({ $group: config });
    return this;
  }

  private parseFieldSelection(selection?: FieldSelection): object {
    if (typeof selection === 'string') {
      return selection
        .split(' ')
        .reduce((proj, field) => ({ ...proj, [field]: 1 }), {});
    }
    return selection || {};
  }

  async exec(): Promise<T[]> {
    return this.model.aggregate(this.pipeline).exec();
  }
}

function aggregate<T>(model: mongoose.Model<T>): AggregateBuilder<T> {
  return new AggregateBuilder(model);
}

export default aggregate;
