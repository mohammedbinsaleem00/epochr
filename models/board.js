// Board data model for .epchr files
class Board {
  constructor(data) {
    this.tasks = data?.tasks || [];
    this.tags = data?.tags || [];
  }

  static fromJSON(json) {
    return new Board(JSON.parse(json));
  }

  toJSON() {
    return JSON.stringify({
      tasks: this.tasks,
      tags: this.tags
    }, null, 2);
  }
}

module.exports = Board;
