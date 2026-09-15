import fs from "fs/promises";
import Bot from "../../client.mjs";
import mongoose from "mongoose";

const SEPRATOR = ".";
class Database {
  /**
   * @param {Bot} client
   */
  constructor(CLIENT_ID) {
    this._cluster = mongoose.connection;
    this._currentClientId = CLIENT_ID; // Store the current client ID

    const isConnected = this._cluster.readyState === 1;

    if (!isConnected)
      throw "Mongo DB is not connected. You have to connect it first! :(".red
        .bold;
  }

  /**
   *
   * @returns {Promise<Database>}
   */

  async LoadModels() {
    return await new Promise(async (res, rej) => {
      try {
        const Dir = await fs.readdir(`./src/Models`);

        for (const Collection of Dir.filter((f) => f.endsWith(".mjs"))) {
          const { default: Model } = await import(`../../Models/${Collection}`);
          await this.Model(Collection.split(".mjs")[0], Model);
        }

        res(this);
      } catch (E) {
        rej(E);
      }
    });
  }

  _getModel(Collection) {
    // Helper function to get the model based on the current client ID
    const collectionName = `${this._currentClientId}${SEPRATOR}${Collection}`;
    return mongoose.model(collectionName);
  }

  /**
   * @returns {Query}
   */

  async FindOne(Collection, Query, Options) {
    const model = this._getModel(Collection);
    return await model.findOne(Query, Options);
  }

  async Find(Collection, Query, Options) {
    const model = this._getModel(Collection);
    return await model.find(Query, Options).exec();
  }

  async Create(Collection, Data) {
    const model = this._getModel(Collection);
    return await model.create(Data);
  }

  /**
   *
   * @param {import("mongoose").UpdateQuery} Update
   * @param {String} Collection
   * @param {import("mongoose").UpdateQuery} Query
   * @param {import("mongoose").QueryOptions} [Options]
   */
  async UpdateOne(Collection, Query, Update, Options) {
    const model = this._getModel(Collection);
    return await model.findOneAndUpdate(Query, Update, Options).exec();
  }

  /**
   * Creates a updateMany query: updates all documents that match filter with update.
   * @param {String} Collection
   * @param {import('mongoose').FilterQuery} Query
   * @param {import('mongoose').UpdateQuery} Update
   * @param {import('mongoose').QueryOptions} Options
   * @returns {import('mongoose').Query}
   */
  async Update(Collection, Query, Update, Options) {
    const model = this._getModel(Collection);
    return await model.updateMany(Query, Update, Options).exec();
  }

  /**
   *
   * @param {String} Collection
   * @param {import('mongoose').PipelineStage} Pipeline
   * @param {import('mongoose').AggregateOptions} Options
   * @param {import('mongoose').Callback} Callback
   * @returns {Aggregate}
   */
  async Aggregate(Collection, Pipeline, Options, Callback) {
    const model = this._getModel(Collection);
    return await model.aggregate([Pipeline], Options, Callback).exec();
  }

  async Delete(Collection, Query) {
    const model = this._getModel(Collection);
    return await model.deleteOne(Query).exec();
  }

  async Size(Collection) {
    const model = this._getModel(Collection);
    return await model.countDocuments().exec();
  }

  async Model(Collection, Model) {
    // Check if the model is already registered to avoid duplicate model names
    const collectionName = `${this._currentClientId}${SEPRATOR}${Collection}`;
    if (!mongoose.connection.models[collectionName]) {
      this._cluster.model(collectionName, new mongoose.Schema(Model));
    }
  }
}

export default Database;
