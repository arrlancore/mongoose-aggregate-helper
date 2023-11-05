# Mongoose Aggregate Helper

`Mongoose Aggregate Helper` is a library that simplifies the process of creating complex aggregation pipelines with Mongoose, the MongoDB object modeling tool designed to work in an asynchronous environment.

## Features

- Easy-to-use API for building MongoDB aggregation pipelines
- Supports joins, matches, sorts, limits, skips, groups
- Type-safe queries with TypeScript support
- Simplifies complex aggregations with method chaining

## Installation

```bash
npm install mongoose-aggregate-helper
# or
yarn add mongoose-aggregate-helper
```

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js
- Mongoose installed in your project

## Usage

Here's a quick example to get you started:

```javascript
const aggregate = require('mongoose-aggregate-helper');
// or if you use ES6 modules
import aggregate from 'mongoose-aggregate-helper';

// Your Mongoose model
const MyModel = require('./models/myModel');

// Creating an aggregation pipeline
const result = aggregate(MyModel)
  .join({
    collection: 'relatedCollection',
    link: ['localField', 'foreignField'],
    select: 'field1 field2',
  })
  .match({ status: 'active' })
  .sort({ createdAt: -1 })
  .limit(10)
  .exec();

// result is a promise that resolves to the aggregation result
```

## API Reference

### `join(config)`

- `config.collection`: The name of the collection to join.
- `config.link`: An array with the local and foreign field names.
- `config.select`: The fields to select from the joined collection.

### `match<U>(condition)`

- `condition`: The match condition.

### `sort(config)`

- `config`: An object specifying the fields to sort by and their sort order.

### `limit(count)`

- `count`: The maximum number of documents to return.

### `skip(count)`

- `count`: The number of documents to skip.

### `group(config)`

- `config`: The configuration for the group stage.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.


## Acknowledgements

- [Mongoose 5 or above](https://mongoosejs.com/)
- [MongoDB 4 or above](https://www.mongodb.com/)


## Peer Dependencies

This library requires Mongoose to be installed in your project. If you haven't already installed Mongoose, you can add it with the following command:

```bash
npm install mongoose
```