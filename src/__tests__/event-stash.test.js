import EventStash from "workerize-loader?ready&name=test!../event-stash";

describe("EventStashWorker", () => {
  let stash;
  beforeAll(() => (stash = new EventStash()));

  it("should be an instance of Worker", () => {
    expect(stash).toEqual(jasmine.any(window.Worker));
  });

  describe("EventStash", () => {
    beforeAll(async () => await stash.open());

    it("should persist an event", async () => {
      const result = await stash.commit({
        type: "question",
        payload: { question: "which color?" }
      });

      expect(result).not.toBe(undefined);
    });

    describe("getByAggregateId", () => {
      let aggregateId;
      let firstEventsId;
      let secondAggregateId;

      beforeAll(async () => {
        const event = await stash.commit({
          type: "question",
          payload: { question: "which color?" }
        });

        aggregateId = event.aggregateId;
        firstEventsId = event._id;

        secondAggregateId = (await stash.commit({
          type: "question",
          payload: { question: "I'm another aggregate" }
        })).aggregateId;

        await stash.commit({
          aggregateId,
          type: "answer",
          payload: { options: ["blue"] }
        });
      });

      it("should return an empty array if no events exist for the aggregateId", async () => {
        const data = await stash.getByAggregateId(["bullshit"]);
        expect(data.length).toBe(0);
      });

      it("should find all events for an aggregate", async () => {
        const data = await stash.getByAggregateId([aggregateId]);
        expect(data.length).toBe(2);
      });

      it("should match the event structure", async () => {
        const [first] = await stash.getByAggregateId([aggregateId]);
        expect(first._id).toBeGreaterThan(0);
        expect(first.type).toBe("question");
        expect(first.payload).toEqual({ question: "which color?" });
        expect(first.aggregateId).toBe(aggregateId);
        expect(first.createdAt).toBeGreaterThan(0);
      });

      it("should return all matching aggregate ids", async () => {
        const data = await stash.getByAggregateId([
          aggregateId,
          secondAggregateId
        ]);
        expect(data.length).toBe(3);
        expect(data[0]._id).toBe(firstEventsId);
      });
    });

    describe("getByType", () => {
      let type = "colors_choices";
      beforeAll(async () => {
        await stash.commit({
          aggregateId: "some-aggregate-id",
          type,
          payload: { options: ["blue"] }
        });

        await stash.commit({
          aggregateId: "some-aggregate-id",
          type,
          payload: { options: ["green"] }
        });
      });

      it("should return an empty array if no events exist for the type", async () => {
        const data = await stash.getByType("bullshit");
        expect(data.length).toBe(0);
      });

      it("should find all events for a type", async () => {
        const data = await stash.getByType(type);
        expect(data.length).toBe(2);
      });

      it("should match the event structure", async () => {
        const [first] = await stash.getByType(type);
        expect(first._id).toBeGreaterThan(0);
        expect(first.type).toBe(type);
        expect(first.payload).toEqual({ options: ["blue"] });
        expect(first.aggregateId).toBe("some-aggregate-id");
        expect(first.createdAt).toBeGreaterThan(0);
      });
    });
  });
});
