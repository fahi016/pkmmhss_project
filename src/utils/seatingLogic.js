/**
 * seatingLogic.js
 * ---------------
 * Core seating algorithm implementation converted 1:1 from public/python_code/seating_logic.py
 */

import {
  DIVISION_LABELS,
  SECOND_LANGUAGE_LABELS,
  SCIENCE_GROUP_DIVISIONS,
  COMMERCE_HUMANITIES_GROUP_DIVISIONS,
  groupDisplayLabel,
  rollSortKey,
  divisionSortKey,
  compareDivisions,
  seatLabel,
} from "./constants";

export class RoomConfig {
  constructor({ name, numBenches, seatsPerBench }) {
    this.name = String(name || "").trim();
    this.numBenches = parseInt(numBenches, 10) || 0;
    this.seatsPerBench = parseInt(seatsPerBench, 10) || 0;
  }

  get capacity() {
    return this.numBenches * this.seatsPerBench;
  }

  /**
   * Return { b0, b1 } -- 1-based column indices split by (col - 1) % 2
   */
  bucketColumns() {
    const b0 = [];
    const b1 = [];
    for (let col = 1; col <= this.seatsPerBench; col++) {
      if ((col - 1) % 2 === 0) {
        b0.push(col);
      } else {
        b1.push(col);
      }
    }
    return { b0, b1 };
  }
}

export class Student {
  constructor({ rollNo = "", name = "", division = "", classDivision = "", admn = "", subject = "", extra = {} }) {
    this.rollNo = String(rollNo || "").trim();
    this.name = String(name || "").trim();
    this.division = String(division || "").trim();
    this.classDivision = String(classDivision || "").trim();
    this.admn = String(admn || "").trim();
    this.subject = String(subject || "").trim();
    this.extra = extra;
  }
}

export class SeatAssignment {
  constructor(room, benchNo, column, student = null) {
    this.room = room;
    this.benchNo = benchNo;
    this.column = column;
    this.student = student;
    this._label = "";
  }
}

export class SeatingResult {
  constructor() {
    this.assignments = [];
    this.warnings = [];
    this.unseated = [];
  }

  byRoom() {
    const out = {};
    for (const a of this.assignments) {
      if (!out[a.room]) {
        out[a.room] = [];
      }
      out[a.room].push(a);
    }
    return out;
  }
}

/**
 * Greedily split divisions between bucket0 and bucket1 so their summed
 * student counts approximate target0 / target1 respectively.
 * Divisions are processed largest-first (classic LPT balancing).
 */
export function partitionDivisions(divCounts, target0, target1) {
  const items = Object.entries(divCounts).sort((a, b) => b[1] - a[1]);
  const bucket0 = [];
  const bucket1 = [];
  let sum0 = 0;
  let sum1 = 0;

  for (const [div, count] of items) {
    const remaining0 = target0 - sum0;
    const remaining1 = target1 - sum1;
    if (remaining0 >= remaining1) {
      bucket0.push(div);
      sum0 += count;
    } else {
      bucket1.push(div);
      sum1 += count;
    }
  }
  return [bucket0, bucket1];
}

/**
 * For flexible seating modes (Custom / Second Language / ad-hoc groups), allow
 * each bench to flip which queue gets the larger odd-column bucket. This keeps
 * adjacent-seat separation intact while using total room capacity more
 * efficiently than a fixed left-to-right pattern.
 */
function chooseBenchOrientation(remaining0, remaining1, bucket0Size, bucket1Size) {
  const normal0 = Math.min(remaining0, bucket0Size);
  const normal1 = Math.min(remaining1, bucket1Size);
  const reverse0 = Math.min(remaining0, bucket1Size);
  const reverse1 = Math.min(remaining1, bucket0Size);

  const normalTotal = normal0 + normal1;
  const reverseTotal = reverse0 + reverse1;
  if (normalTotal !== reverseTotal) {
    return normalTotal > reverseTotal ? "normal" : "reverse";
  }

  const normalDiff = Math.abs((remaining0 - normal0) - (remaining1 - normal1));
  const reverseDiff = Math.abs((remaining0 - reverse0) - (remaining1 - reverse1));
  if (normalDiff !== reverseDiff) {
    return normalDiff < reverseDiff ? "normal" : "reverse";
  }

  if (remaining0 !== remaining1) {
    return remaining0 > remaining1 ? "normal" : "reverse";
  }

  return "normal";
}

/**
 * Assign consecutive rooms to each batch in order.
 * Non-final batches take rooms until capacity covers their student count.
 * The final batch receives all remaining rooms.
 */
export function allocateRoomsToBatches(rooms, batchSizes) {
  if (!batchSizes || batchSizes.length === 0) return [];
  const allocations = [];
  let idx = 0;

  for (let b = 0; b < batchSizes.length; b++) {
    const size = batchSizes[b];
    const batchRooms = [];
    let cap = 0;

    if (b === batchSizes.length - 1) {
      allocations.push(rooms.slice(idx));
      idx = rooms.length;
    } else {
      while (idx < rooms.length && (cap < size || batchRooms.length === 0)) {
        batchRooms.push(rooms[idx]);
        cap += rooms[idx].capacity;
        idx++;
      }
      allocations.push(batchRooms);
    }
  }
  return allocations;
}

/**
 * Run the seating algorithm for one student set across the given rooms.
 */
export function assignSeatsCore(students, rooms, sortByClassDivision = false) {
  const result = new SeatingResult();

  const byDiv = {};
  for (const s of students) {
    if (!byDiv[s.division]) {
      byDiv[s.division] = [];
    }
    byDiv[s.division].push(s);
  }

  const divCounts = {};
  for (const div in byDiv) {
    divCounts[div] = byDiv[div].length;
  }
  const totalStudents = students.length;

  let totalBucket0Cap = 0;
  let totalBucket1Cap = 0;
  let anyMultiSeatRoom = false;

  for (const r of rooms) {
    const { b0, b1 } = r.bucketColumns();
    totalBucket0Cap += b0.length * r.numBenches;
    totalBucket1Cap += b1.length * r.numBenches;
    if (r.seatsPerBench >= 2) {
      anyMultiSeatRoom = true;
    }
  }

  const totalCapacity = totalBucket0Cap + totalBucket1Cap;

  if (totalCapacity < totalStudents) {
    result.warnings.push(
      `Total room capacity (${totalCapacity}) is less than the number of ` +
      `students (${totalStudents}). ${totalStudents - totalCapacity} ` +
      `student(s) will be left unseated.`
    );
  }

  const nDivisions = Object.keys(divCounts).length;
  if (anyMultiSeatRoom && nDivisions < 2) {
    const safeCapacity = Math.max(totalBucket0Cap, totalBucket1Cap);
    if (totalStudents > safeCapacity) {
      result.warnings.push(
        `Only one seating group was detected in the data. To keep students ` +
        `with the same paper apart, only ${safeCapacity} of the ${totalCapacity} ` +
        `seats can safely be used (one seat per bench is left empty as a spacer). ` +
        `${totalStudents - safeCapacity} student(s) will not fit.`
      );
    } else {
      const onlyGroup = Object.keys(divCounts)[0] || "?";
      const onlyLabel = groupDisplayLabel(onlyGroup);
      const groupDesc = onlyLabel !== onlyGroup ? `'${onlyGroup}' (${onlyLabel})` : `'${onlyGroup}'`;
      result.warnings.push(
        `Only one seating group was detected (${groupDesc}), so one seat ` +
        `per bench is intentionally left empty as a spacer. ` +
        `Safe usable capacity: ${safeCapacity} of ${totalCapacity} seats -- ` +
        `this comfortably fits all ${totalStudents} student(s). ` +
        `For Regular Subjects use the DIVISION column (S1-S8). ` +
        `For Second Language use the SL column (A/H/M/U). ` +
        `For English turn ON 'Treat everyone as ONE single group'.`
      );
    }
  }

  const target0 = totalCapacity > 0 ? Math.round(totalStudents * (totalBucket0Cap / totalCapacity)) : 0;
  const target1 = totalStudents - target0;

  const divisionsPresent = new Set(Object.keys(divCounts));
  const knownStreamDivisions = new Set([...SCIENCE_GROUP_DIVISIONS, ...COMMERCE_HUMANITIES_GROUP_DIVISIONS]);

  let isSubset = divisionsPresent.size > 0;
  for (const d of divisionsPresent) {
    if (!knownStreamDivisions.has(d)) {
      isSubset = false;
      break;
    }
  }

  let bucket0Divs = [];
  let bucket1Divs = [];

  if (isSubset) {
    bucket0Divs = Array.from(divisionsPresent)
      .filter((d) => SCIENCE_GROUP_DIVISIONS.has(d))
      .sort(compareDivisions);
    bucket1Divs = Array.from(divisionsPresent)
      .filter((d) => COMMERCE_HUMANITIES_GROUP_DIVISIONS.has(d))
      .sort(compareDivisions);
  } else {
    [bucket0Divs, bucket1Divs] = partitionDivisions(divCounts, target0, target1);
  }

  function buildQueue(divList) {
    const queue = [];
    const sortedDivs = [...divList].sort(compareDivisions);
    for (const d of sortedDivs) {
      if (byDiv[d]) {
        queue.push(...byDiv[d]);
      }
    }
    if (sortByClassDivision) {
      queue.sort((a, b) => {
        const divA = a.classDivision || a.division;
        const divB = b.classDivision || b.division;
        const divComp = compareDivisions(divA, divB);
        if (divComp !== 0) return divComp;
        const rA = rollSortKey(a.rollNo);
        const rB = rollSortKey(b.rollNo);
        if (typeof rA === 'number' && typeof rB === 'number') {
          return rA - rB;
        }
        return String(rA).localeCompare(String(rB));
      });
    }
    return queue;
  }

  const queue0 = buildQueue(bucket0Divs);
  const queue1 = buildQueue(bucket1Divs);

  let idx0 = 0;
  let idx1 = 0;
  const allowDynamicBenchFlip = !isSubset && queue0.length > 0 && queue1.length > 0;

  for (const room of rooms) {
    const { b0: b0Cols, b1: b1Cols } = room.bucketColumns();
    for (let benchNo = 1; benchNo <= room.numBenches; benchNo++) {
      let bucket0Queue = queue0;
      let bucket1Queue = queue1;
      let bucket0Idx = idx0;
      let bucket1Idx = idx1;
      let bucket0Key = "idx0";
      let bucket1Key = "idx1";

      if (allowDynamicBenchFlip && b0Cols.length !== b1Cols.length) {
        const orientation = chooseBenchOrientation(
          queue0.length - idx0,
          queue1.length - idx1,
          b0Cols.length,
          b1Cols.length
        );

        if (orientation === "reverse") {
          bucket0Queue = queue1;
          bucket1Queue = queue0;
          bucket0Idx = idx1;
          bucket1Idx = idx0;
          bucket0Key = "idx1";
          bucket1Key = "idx0";
        }
      }

      for (const col of b0Cols) {
        let student = null;
        if (bucket0Idx < bucket0Queue.length) {
          student = bucket0Queue[bucket0Idx++];
        }
        result.assignments.push(new SeatAssignment(room.name, benchNo, col, student));
      }
      for (const col of b1Cols) {
        let student = null;
        if (bucket1Idx < bucket1Queue.length) {
          student = bucket1Queue[bucket1Idx++];
        }
        result.assignments.push(new SeatAssignment(room.name, benchNo, col, student));
      }

      if (bucket0Key === "idx0") {
        idx0 = bucket0Idx;
        idx1 = bucket1Idx;
      } else {
        idx1 = bucket0Idx;
        idx0 = bucket1Idx;
      }
    }
  }

  result.unseated = queue0.slice(idx0).concat(queue1.slice(idx1));
  if (result.unseated.length > 0) {
    const names = result.unseated.slice(0, 10).map((s) => s.name).join(", ");
    const more = result.unseated.length <= 10 ? "" : ` (+${result.unseated.length - 10} more)`;
    result.warnings.push(
      `${result.unseated.length} student(s) could not be seated due to ` +
      `insufficient room capacity: ${names}${more}`
    );
  }

  return result;
}

/**
 * Assign students to seats (supports division_batches for Second Language mode).
 */
export function assignSeats(students, rooms, divisionBatches = null) {
  if (!divisionBatches || divisionBatches.length === 0) {
    return assignSeatsCore(students, rooms);
  }

  const combined = new SeatingResult();
  const batchSizes = [];
  const batchStudents = [];

  const allAssigned = new Set();
  for (const batchDivs of divisionBatches) {
    const divSet = new Set(batchDivs);
    const batch = students.filter((s) => divSet.has(s.classDivision || s.division));
    
    batch.sort((a, b) => {
      const divA = a.classDivision || a.division;
      const divB = b.classDivision || b.division;
      const divComp = compareDivisions(divA, divB);
      if (divComp !== 0) return divComp;
      const rA = rollSortKey(a.rollNo);
      const rB = rollSortKey(b.rollNo);
      if (typeof rA === 'number' && typeof rB === 'number') return rA - rB;
      return String(rA).localeCompare(String(rB));
    });

    batchStudents.push(batch);
    batchSizes.push(batch.length);
    for (const s of batch) {
      allAssigned.add(s.classDivision || s.division);
    }
  }

  const presentDivs = new Set(students.map((s) => s.classDivision || s.division));
  const missing = Array.from(presentDivs).filter((d) => !allAssigned.has(d));
  if (missing.length > 0) {
    missing.sort(compareDivisions);
    combined.warnings.push(
      `Division batch setup does not include: ${missing.join(", ")}. ` +
      `Those students will not be seated.`
    );
  }

  const roomGroups = allocateRoomsToBatches(rooms, batchSizes);

  for (let i = 0; i < batchStudents.length; i++) {
    const batch = batchStudents[i];
    const batchRooms = roomGroups[i] || [];
    const batchDivsLabel = [...divisionBatches[i]].sort(compareDivisions).join(", ");
    const roomNames = batchRooms.map((r) => r.name);
    const batchNum = i + 1;

    if (!batch || batch.length === 0) {
      combined.warnings.push(`Batch ${batchNum} (${batchDivsLabel}): no students loaded.`);
      continue;
    }

    if (!batchRooms || batchRooms.length === 0) {
      combined.warnings.push(
        `Batch ${batchNum} (${batchDivsLabel}): no rooms allocated — ` +
        `${batch.length} student(s) could not be seated.`
      );
      combined.unseated.push(...batch);
      continue;
    }

    const batchCap = batchRooms.reduce((sum, r) => sum + r.capacity, 0);
    combined.warnings.push(
      `Batch ${batchNum} (${batchDivsLabel}): ${batch.length} student(s) -> ` +
      `${roomNames.join(", ")} (${batchCap} seats)`
    );

    const partial = assignSeatsCore(batch, batchRooms, true);
    combined.assignments.push(...partial.assignments);
    combined.warnings.push(...partial.warnings);
    combined.unseated.push(...partial.unseated);
  }

  return combined;
}

/**
 * Sanity check: scans every bench row and confirms no two physically
 * adjacent columns share the same division. Returns a list of violation
 * descriptions (empty list = all good).
 */
export function verifyNoAdjacentSameDivision(result, rooms) {
  const violations = [];
  const roomMap = {};
  for (const r of rooms) {
    roomMap[r.name] = r;
  }

  const byRoom = result.byRoom();
  for (const roomName in byRoom) {
    const seats = byRoom[roomName];
    const room = roomMap[roomName];
    if (!room) continue;

    const byBench = {};
    for (const a of seats) {
      if (!byBench[a.benchNo]) {
        byBench[a.benchNo] = {};
      }
      byBench[a.benchNo][a.column] = a;
    }

    for (const benchNo in byBench) {
      const cols = byBench[benchNo];
      for (let col = 1; col < room.seatsPerBench; col++) {
        const a1 = cols[col];
        const a2 = cols[col + 1];
        if (a1 && a2 && a1.student && a2.student) {
          if (a1.student.division === a2.student.division) {
            violations.push(
              `${roomName} Bench ${benchNo}: columns ${col} & ${col + 1} ` +
              `both '${a1.student.division}' ` +
              `(${a1.student.name} / ${a2.student.name})`
            );
          }
        }
      }
    }
  }
  return violations;
}

/**
 * Adds human-readable seat label (Left/Middle/Right/Seat N) onto each SeatAssignment as `_label`.
 */
export function attachSeatLabels(result, rooms) {
  const roomMap = {};
  for (const r of rooms) {
    roomMap[r.name] = r;
  }
  for (const a of result.assignments) {
    const room = roomMap[a.room];
    if (room) {
      a._label = seatLabel(a.column, room.seatsPerBench);
    }
  }
}
