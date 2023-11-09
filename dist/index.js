"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class Aggregate {
    constructor(model) {
        this.pipeline = [];
        this.hasGrouped = false;
        this.model = model;
    }
    /**
     *
     * @param config
     * if config.link[0] start with # we will convert it to be objectId
     * @returns
     */
    join(config) {
        if (typeof config.collection !== 'string') {
            throw new TypeError('Collection name must be a string. Received: ' + config.collection);
        }
        if (!Array.isArray(config.link) ||
            !config.link.every((field) => typeof field === 'string')) {
            throw new TypeError('Link must be an array of strings.');
        }
        if (config.select &&
            typeof config.select !== 'string' &&
            typeof config.select !== 'object') {
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
                        $project: this.parseFieldSelection(this.ensureIdIncluded(config.select)),
                    },
                ],
                as,
            },
        };
        this.pipeline.push(lookupStage);
        const populate = config.populate !== undefined ? config.populate : true;
        const preserveNullAndEmptyArrays = config.preserveNullAndEmptyArrays !== undefined
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
    ensureIdIncluded(select) {
        if (typeof select === 'string') {
            // If _id is not included in the string, add it
            if (!select.includes('_id')) {
                select = '_id ' + select;
            }
        }
        else if (typeof select === 'object' && !select.hasOwnProperty('_id')) {
            // If _id is not a key in the object, add it
            select = Object.assign({ _id: 1 }, select);
        }
        return select;
    }
    // Allow the user to specify the type for the match condition
    match(matchCondition) {
        // Add the match condition to the pipeline
        this.pipeline.push({ $match: matchCondition });
        return this;
    }
    sort(config) {
        this.pipeline.push({ $sort: config });
        return this;
    }
    limit(count) {
        this.pipeline.push({ $limit: count });
        return this;
    }
    skip(count) {
        this.pipeline.push({ $skip: count });
        return this;
    }
    group(config) {
        if (this.hasGrouped) {
            throw new Error('Cannot call group again after a grouping operation.');
        }
        this.hasGrouped = true;
        this.pipeline.push({ $group: config });
        return this;
    }
    select(fields) {
        // Add a $project stage to the pipeline with the specified fields
        const projectStage = {
            $project: this.parseFieldSelection(this.ensureIdIncluded(fields)),
        };
        this.pipeline.push(projectStage);
        return this;
    }
    parseFieldSelection(selection) {
        if (typeof selection === 'string') {
            return selection
                .split(' ')
                .reduce((proj, field) => (Object.assign(Object.assign({}, proj), { [field]: 1 })), {});
        }
        return selection || {};
    }
    exec() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.aggregate(this.pipeline).exec();
        });
    }
    // Method to count documents with an optional alias for the count field
    count(as = 'total') {
        return __awaiter(this, void 0, void 0, function* () {
            // Clone the pipeline and remove $skip and $limit stages
            const countPipeline = this.pipeline.filter((stage) => !stage.hasOwnProperty('$skip') && !stage.hasOwnProperty('$limit'));
            // Add the $count stage with the alias
            countPipeline.push({ $count: as });
            // Execute the count pipeline
            const countResult = yield this.model.aggregate(countPipeline).exec();
            // Return the count or 0 if no documents are found
            return countResult.length > 0 ? countResult[0][as] : 0;
        });
    }
    // incase need the raw pipeline
    get aggregatePipeline() {
        return this.pipeline;
    }
}
function aggregate(model) {
    return new Aggregate(model);
}
exports.default = aggregate;
