/*
 * redix
 * Copyright(c) 2018 Vahagn Mkrtchyan <vahagn.mkrtchyan@gmail.com>
 * MIT Licensed
 */

const AsyncFunction = (async () => {}).constructor;
const Async = fn => fn instanceof AsyncFunction;

const Asyncify = (fn) => {
  if (fn.length === 2) {
    return fn;
  }

  if (fn.length === 3) {
    return async (req, res) => {
      const next = (resolve, reject, e) => { 
        resolve(e);
      };
      const val = await new Promise((resolve, reject) => {
        fn(req, res, next.bind(null, resolve, reject));
      });
      
      return val;
    }
  }

  if (fn.length === 4) {
    return async (err, req, res) => {
      const next = (resolve, reject, e) => { 
        resolve(e);
      };
      const val = await new Promise((resolve, reject) => {
        fn(err, req, res, next.bind(null, resolve, reject));
      });
      
      return val;
    }
  }
}

module.exports = {
  Async,
  Asyncify,
  AsyncFunction
}