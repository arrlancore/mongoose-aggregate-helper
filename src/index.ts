import mongoose, { PipelineStage } from 'mongoose';

export type FieldSelection = string | { [key: string]: 1 | 0 };

// Define the configuration object for the join operation
export interface JoinConfig {
  collection: string;
  link: [string, string?]; // Tuple with local and optional foreign field
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

class Aggregate<T> {
  private model: mongoose.Model<T>;
  private pipeline: PipelineStage[] = [];
  private hasGrouped: boolean = false;

  constructor(model: mongoose.Model<T>) {
    this.model = model;
  }

  /**
   *
   * @param config
   * if config.link[0] start with # we will convert it to be objectId
   * @returns
   */
  join(config: JoinConfig): this {
    if (typeof config.collection !== 'string') {
      throw new TypeError(
        'Collection name must be a string. Received: ' + config.collection,
      );
    }
    if (
      !Array.isArray(config.link) ||
      !config.link.every((field) => typeof field === 'string')
    ) {
      throw new TypeError('Link must be an array of strings.');
    }
    if (
      config.select &&
      typeof config.select !== 'string' &&
      typeof config.select !== 'object'
    ) {
      throw new TypeError('Select must be a string or an object.');
    }

    const localFieldNeedsObjectId = config.link[0].startsWith('#');
    const localField = localFieldNeedsObjectId
      ? config.link[0].substring(1)
      : config.link[0];
    const foreignField = config.link[1] || '_id';

    // Add a field conversion stage if necessary
    const localFieldObjectId = `${localField}ObjectID`;
    if (localFieldNeedsObjectId) {
      const convertToLocalObjectIdStage = {
        $addFields: {
          [localFieldObjectId]: { $toObjectId: `$${localField}` },
        },
      };
      this.pipeline.push(convertToLocalObjectIdStage);
    }

    const as = config.populate === 'string' ? config.populate : localField; // Use a more descriptive alias
    // Construct the $lookup stage
    const lookupStage = {
      $lookup: {
        from: config.collection,
        let: {
          localId: localFieldNeedsObjectId
            ? `$${localFieldObjectId}`
            : `$${localField}`,
        },
        pipeline: [
          { $match: { $expr: { $eq: [`$${foreignField}`, `$$localId`] } } },
          {
            $project: this.parseFieldSelection(
              this.ensureIdIncluded(config.select!),
            ),
          },
        ],
        as,
      },
    };

    this.pipeline.push(lookupStage);

    const populate = config.populate !== undefined ? config.populate : true;
    const preserveNullAndEmptyArrays =
      config.preserveNullAndEmptyArrays !== undefined
        ? config.preserveNullAndEmptyArrays
        : true;
    // Add an $unwind stage if populate is true
    if (populate) {
      const unwindStage = {
        $unwind: {
          path: `$${as}`,
          preserveNullAndEmptyArrays: preserveNullAndEmptyArrays,
        },
      };
      this.pipeline.push(unwindStage);
    }

    if (localFieldNeedsObjectId) {
      const removeFieldObjectId = {
        $project: {
          [localFieldObjectId]: 0,
        },
      };

      this.pipeline.push(removeFieldObjectId);
    }

    return this;
  }

  ensureIdIncluded(select: FieldSelection) {
    if (typeof select === 'string') {
      // If _id is not included in the string, add it
      if (!select.includes('_id')) {
        select = '_id ' + select;
      }
    } else if (typeof select === 'object' && !select.hasOwnProperty('_id')) {
      // If _id is not a key in the object, add it
      select = { _id: 1, ...select };
    }
    return select;
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

  select(fields: FieldSelection): this {
    // Add a $project stage to the pipeline with the specified fields
    const projectStage = {
      $project: this.parseFieldSelection(this.ensureIdIncluded(fields)),
    };
    this.pipeline.push(projectStage);
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

  // Method to count documents with an optional alias for the count field
  async count(as = 'total') {
    // Clone the pipeline and remove $skip and $limit stages
    const countPipeline = this.pipeline.filter(
      (stage) =>
        !stage.hasOwnProperty('$skip') && !stage.hasOwnProperty('$limit'),
    );

    // Add the $count stage with the alias
    countPipeline.push({ $count: as });

    // Execute the count pipeline
    const countResult = await this.model.aggregate(countPipeline).exec();

    // Return the count or 0 if no documents are found
    return countResult.length > 0 ? countResult[0][as] : 0;
  }

  // incase need the raw pipeline
  get aggregatePipeline() {
    return this.pipeline;
  }
}

function aggregate<T>(model: mongoose.Model<T>): Aggregate<T> {
  return new Aggregate(model);
}

export default aggregate;
