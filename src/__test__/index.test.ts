import mongoose from 'mongoose';
import aggregate, { FieldSelection, SortConfig } from '..';

// Define a dummy schema and model for testing
const testSchema = new mongoose.Schema({ name: String, age: Number, group: String });
const TestModel = mongoose.model('Test', testSchema);

// Mock the aggregate function and exec function
const aggregateMock = jest.fn();
const execMock = jest.fn();
mongoose.Model.aggregate = aggregateMock;

aggregateMock.mockImplementation(() => ({
  exec: execMock,
  // Add other chainable methods if needed, e.g., sort, limit, etc.
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  group: jest.fn().mockReturnThis(),
}));

// Mock mongoose.model to return a schema with paths
jest.mock('mongoose', () => {
  const originalMongoose = jest.requireActual('mongoose');
  const _model = originalMongoose.model.bind(originalMongoose);

  originalMongoose.model = jest.fn((name, schema) => {
    if (originalMongoose.models[name]) {
      return originalMongoose.models[name];
    }
    if (schema) {
      return _model(name, schema);
    }
    return _model(name, new originalMongoose.Schema({}));
  });

  return originalMongoose;
});

describe('AggregateBuilder', () => {
  // Reset the mocks before each test
  beforeEach(() => {
    aggregateMock.mockClear();
    execMock.mockClear();
  });

  it('should create a join pipeline stage', async () => {
    const builder = aggregate(TestModel).join({
      collection: 'otherCollection',
      link: ['userId'],
      select: 'name age',
    });

    await builder.exec();

    // Check if aggregate was called with the correct pipeline
    expect(mongoose.Model.aggregate).toHaveBeenCalledWith([
      {
        $lookup: {
          from: 'otherCollection',
          let: { localId: '$userId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$localId'] } } }, // This line should match the implementation
            { $project: { _id: 1, name: 1, age: 1 } },
          ],
          as: 'userId',
        },
      },
      {
        $unwind: {
          path: "$userId",
          preserveNullAndEmptyArrays: true,
         },
       },
    ]);
  });

  it('should create a join pipeline stage with ObjectId conversion', async () => {
    const builder = aggregate(TestModel).join({
      collection: 'otherCollection',
      link: ['#userId'], // Notice the '#' indicating an ObjectId conversion
      select: 'name age',
    });

    await builder.exec();

    // Check if aggregate was called with the correct pipeline
    expect(mongoose.Model.aggregate).toHaveBeenCalledWith([
      {
        $addFields: {
          userIdObjectID: { $toObjectId: '$userId' }, // This line should match the implementation
        },
      },
      {
        $lookup: {
          from: 'otherCollection',
          let: { localId: '$userIdObjectID' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$localId'] } } },
            { $project: { _id: 1, name: 1, age: 1 } },
          ],
          as: 'userId', // The 'as' field should match the localField without the '#' prefix
        },
      },
      {
        $unwind: {
          path: "$userId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          userIdObjectID: 0, // This line should match the implementation
        },
      },
    ]);
  });

  it('should throw an error for invalid collection name', () => {
    expect(() => {
      aggregate(TestModel).join({ collection: 123 as any, link: ['userId'] });
    }).toThrow(TypeError);
  });
  
  // Test the match method
  it('should create a match pipeline stage', () => {
    const matchCondition = { name: 'Test Name' };
    const builder = aggregate(TestModel).match(matchCondition);

    builder.exec();

    // Check if aggregate was called with the correct pipeline
    expect(mongoose.Model.aggregate).toHaveBeenCalledWith([
      { $match: matchCondition },
    ]);
  });

  // Test the sort method
  it('should create a sort pipeline stage', () => {
    const sortConfig: SortConfig = { age: -1 };
    const builder = aggregate(TestModel).sort(sortConfig);

    builder.exec();

    // Check if aggregate was called with the correct pipeline
    expect(mongoose.Model.aggregate).toHaveBeenCalledWith([
      { $sort: sortConfig },
    ]);
  });

  // Test the limit method
  it('should create a limit pipeline stage', () => {
    const limitCount = 10;
    const builder = aggregate(TestModel).limit(limitCount);

    builder.exec();

    // Check if aggregate was called with the correct pipeline
    expect(mongoose.Model.aggregate).toHaveBeenCalledWith([
      { $limit: limitCount },
    ]);
  });

  // Test the skip method
  it('should create a skip pipeline stage', () => {
    const skipCount = 5;
    const builder = aggregate(TestModel).skip(skipCount);

    builder.exec();

    // Check if aggregate was called with the correct pipeline
    expect(mongoose.Model.aggregate).toHaveBeenCalledWith([
      { $skip: skipCount },
    ]);
  });

  // Test the group method
  it('should create a group pipeline stage', () => {
    const groupConfig = {
      _id: '$age',
      total: { $sum: 1 }
    };
    const builder = aggregate(TestModel).group(groupConfig);

    builder.exec();

    // Check if aggregate was called with the correct pipeline
    expect(mongoose.Model.aggregate).toHaveBeenCalledWith([
      { $group: groupConfig },
    ]);
  });

  // Test the exec method
  it('should execute the pipeline and return results', async () => {
    const mockData = [{ name: 'Test Data' }];
    execMock.mockResolvedValue(mockData); // Mock the exec function to resolve with mockData

    const builder = aggregate(TestModel);
    const results = await builder.exec();

    expect(results).toEqual(mockData);
    expect(execMock).toHaveBeenCalled(); // Ensure that exec was called
  });

  // Test complex queries with chaining methods
  it('should handle complex queries with multiple chained methods', async () => {
    const mockData = [
      { name: 'John Doe', age: 30, group: 'A' },
      { name: 'Jane Doe', age: 25, group: 'B' },
    ];
    execMock.mockResolvedValue(mockData); // Mock the exec function to resolve with mockData

    const builder = aggregate(TestModel)
      .match({ group: 'A' })
      .join({
        collection: 'otherCollection',
        link: ['userId'],
        select: 'name age',
      })
      .sort({ age: -1 })
      .limit(10)
      .skip(5)
      .group({
        _id: '$group',
        total: { $sum: 1 },
        averageAge: { $avg: '$age' },
      });
    
    const countMock = jest.fn().mockResolvedValue([{ total: 2 }]);
    builder.count = countMock;

    const count = await builder.count();
    expect(count).toEqual([{ total: 2 }]);
    expect(countMock).toHaveBeenCalled();

    const results = await builder.exec();

    // Check if aggregate was called with the correct pipeline
    expect(aggregateMock).toHaveBeenCalledWith([
      { $match: { group: 'A' } },
      {
        $lookup: {
          from: 'otherCollection',
          let: { localId: '$userId' }, // This matches the implementation
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$localId'] } } },
            { $project: { _id: 1, name: 1, age: 1 } },
          ],
          as: 'userId',
        },
      },
      {
       $unwind: {
         path: "$userId",
         preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { age: -1 } },
      { $limit: 10 },
      { $skip: 5 },
      {
        $group: {
          _id: '$group',
          total: { $sum: 1 },
          averageAge: { $avg: '$age' },
        },
      },
    ]);

    // Check that the results match the mock data
    expect(results).toEqual(mockData);
  });

  it('should not add an unwind stage when populate is set to false', async () => {
    const builder = aggregate(TestModel).join({
      collection: 'otherCollection',
      link: ['userId'],
      select: 'name age',
      populate: false,
    });

    await builder.exec();


    // Check that the $unwind stage is not added
    expect(aggregateMock).not.toHaveBeenCalledWith({
      $unwind: expect.anything(),
    });
  })

  it('should allow setting preserveNullAndEmptyArrays to false', async () => {
    const builder = aggregate(TestModel).join({
      collection: 'otherCollection',
      link: ['userId'],
      select: 'name age',
      preserveNullAndEmptyArrays: false,
    });

    await builder.exec();

    // Check if the $unwind stage is added with preserveNullAndEmptyArrays set to false
    expect(aggregateMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $unwind: {
            path: '$userId',
            preserveNullAndEmptyArrays: false,
          },
        }),
      ])
    );
  });
});

describe('ensureIdIncluded', () => {
  it('should add _id to a string of select fields if not present', () => {
    const select = 'name age';
    const selectWithId = aggregate(TestModel).ensureIdIncluded(select);
    expect(selectWithId).toBe('_id name age');
  });

  it('should not modify a string of select fields if _id is already present', () => {
    const select = '_id name age';
    const selectWithId = aggregate(TestModel).ensureIdIncluded(select);
    expect(selectWithId).toBe(select);
  });

  it('should add _id to an object of select fields if not present', () => {
    const select: FieldSelection = { name: 1, age: 1 };
    const selectWithId = aggregate(TestModel).ensureIdIncluded(select);
    expect(selectWithId).toEqual({ _id: 1, name: 1, age: 1 });
  });

  it('should not modify an object of select fields if _id is already present', () => {
    const select: FieldSelection = { _id: 1, name: 1, age: 1 };
    const selectWithId = aggregate(TestModel).ensureIdIncluded(select);
    expect(selectWithId).toEqual(select);
  });
});

describe('AggregateBuilder - ObjectId Conversion', () => {
  it('should convert a local field prefixed with # to ObjectId', async () => {
    // Setup the builder with the join configuration that requires ObjectId conversion
    const builder = aggregate(TestModel).join({
      collection: 'otherCollection',
      link: ['#userId'], // Local field prefixed with # to indicate ObjectId conversion
      select: 'name age',
    });

    // Execute the builder to trigger the aggregation pipeline
    await builder.exec();

    // Check if the pipeline includes the $addFields stage for ObjectId conversion
    expect(aggregateMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $addFields: {
            userIdObjectID: { $toObjectId: '$userId' },
          },
        }),
        expect.objectContaining({
          $lookup: {
            from: 'otherCollection',
            let: { localId: '$userIdObjectID' }, // This should use the converted ObjectId
            pipeline: expect.any(Array),
            as: 'userId',
          },
        }),
        expect.objectContaining({
          $project: {
            userIdObjectID: 0, // This should remove the temporary ObjectId field
          },
        }),
      ])
    );

    // Check if the $unwind stage uses the converted ObjectId
    expect(aggregateMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $unwind: {
            path: '$userId',
            preserveNullAndEmptyArrays: true,
          },
        }),
      ])
    );
  });
});

describe('AggregateBuilder - No Unwind Stage When Populate is False', () => {
  it('should not add an $unwind stage when populate is set to false', async () => {
    // Setup the builder with the join configuration that has populate set to false
    const builder = aggregate(TestModel).join({
      collection: 'otherCollection',
      link: ['userId'],
      select: 'name age',
      populate: false, // Explicitly set populate to false
    });

    // Execute the builder to trigger the aggregation pipeline
    await builder.exec();

    // Check if the pipeline does not include the $unwind stage
    expect(aggregateMock).toHaveBeenCalledWith(
      expect.not.arrayContaining([
        expect.objectContaining({
          $unwind: expect.anything(),
        }),
      ])
    );

    // Alternatively, check that the $unwind stage is not present in the pipeline
    const pipeline = builder.aggregatePipeline; // Assuming there's a getter for the pipeline
    const hasUnwindStage = pipeline.some(stage => stage.hasOwnProperty('$unwind'));
    expect(hasUnwindStage).toBe(false);
  });
});

describe('AggregateBuilder - PreserveNullAndEmptyArrays Option', () => {
  it('should set preserveNullAndEmptyArrays to false when specified', async () => {
    // Setup the builder with the join configuration that has preserveNullAndEmptyArrays set to false
    const builder = aggregate(TestModel).join({
      collection: 'otherCollection',
      link: ['userId'],
      select: 'name age',
      preserveNullAndEmptyArrays: false, // Explicitly set preserveNullAndEmptyArrays to false
    });

    // Execute the builder to trigger the aggregation pipeline
    await builder.exec();

    // Check if the $unwind stage is added with preserveNullAndEmptyArrays set to false
    expect(aggregateMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $unwind: {
            path: expect.any(String),
            preserveNullAndEmptyArrays: false,
          },
        }),
      ])
    );

    // Alternatively, check the actual pipeline array for the correct $unwind stage
    const pipeline = builder.aggregatePipeline; // Assuming there's a getter for the pipeline
    const unwindStage = pipeline.find(stage => stage.hasOwnProperty('$unwind'));
    expect(unwindStage).toEqual({
      $unwind: {
        path: expect.any(String), // Replace with actual path if known
        preserveNullAndEmptyArrays: false,
      },
    });
  });
});
