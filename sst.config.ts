import { SSTConfig } from "sst";

export default {
  config(_input) {
    return {
      name: "mafia",
      region: "ap-southeast-2",
    };
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      runtime: "python3.11",
    });


  },
} satisfies SSTConfig;
