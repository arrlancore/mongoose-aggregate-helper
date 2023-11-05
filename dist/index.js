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
class AggregateBuilder {
    constructor(model) {
        this.pipeline = [];
        this.hasGrouped = false;
        this.model = model;
    }
    join(config) {
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
}
function aggregate(model) {
    return new AggregateBuilder(model);
}
exports.default = aggregate;
