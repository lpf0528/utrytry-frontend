/**
 * 目录结构编辑的纯函数工具 (与后端 toc_structure.validate_structure 规则保持一致)。
 *
 * 草稿 (draft) 为按 chapter_index 升序的扁平数组, 每项形如:
 * { id, title, chapter_index, word_count, level, parent_id, is_disabled }
 * 树形展示只是 draft 的渲染视图, 所有编辑都直接作用于 draft。
 */

// 与后端保存接口一致: 0 <= level <= 9
export const MIN_LEVEL = 0;
export const MAX_LEVEL = 9;

/**
 * 将后端返回的目录树展开为按 chapter_index 升序的扁平草稿
 * @param {Array} nodes 后端 ChapterNode 树
 * @returns {Array} 扁平草稿
 */
export function treeToDraft(nodes) {
  const result = [];
  const walk = list => {
    if (!Array.isArray(list)) return;
    for (const node of list) {
      result.push({
        id: node.id,
        title: node.title,
        chapter_index: node.chapter_index,
        word_count: node.word_count || 0,
        level: node.level ?? 0,
        parent_id: node.parent_id ?? null,
        is_disabled: node.is_disabled ? 1 : 0
      });
      walk(node.children);
    }
  };
  walk(nodes);
  // 树的遍历顺序不一定等于阅读顺序 (parent_id 可能跨层挂接), 统一按章节序号排序
  result.sort((a, b) => a.chapter_index - b.chapter_index);
  return result;
}

/**
 * 从 fromIndex 起, 按"默认父节点算法"重新计算 parent_id:
 * 父节点 = 阅读顺序上最近的、level 严格小于自身的前序节点, 没有则为 null。
 * 用单调栈一次遍历完成 (O(n)); fromIndex 之前的节点只参与建栈、不会被修改。
 * @param {Array} draft 扁平草稿 (原地修改)
 * @param {number} fromIndex 起始下标
 */
export function recomputeParents(draft, fromIndex = 0) {
  // 栈内 level 严格递增, 栈顶即当前节点的候选父节点
  const stack = [];
  for (let i = 0; i < draft.length; i++) {
    const node = draft[i];
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    if (i >= fromIndex) {
      node.parent_id = stack.length > 0 ? stack[stack.length - 1].id : null;
    }
    stack.push(node);
  }
}

/**
 * 调整某个章节的层级 (缩进 +1 / 反缩进 -1), 并重算该节点及其后续节点的 parent_id
 * @param {Array} draft 扁平草稿 (原地修改)
 * @param {number} index 目标节点下标
 * @param {number} delta 层级变化量
 * @returns {boolean} 是否发生了变化 (越界时不变)
 */
export function changeLevel(draft, index, delta) {
  const node = draft[index];
  if (!node) return false;
  const next = node.level + delta;
  if (next < MIN_LEVEL || next > MAX_LEVEL) return false;
  node.level = next;
  // 层级变化会影响后续节点的"最近更低层级前序节点", 因此从该节点起整体重算
  recomputeParents(draft, index);
  return true;
}

/**
 * 校验草稿是否满足保存接口的规则, 返回第一处错误信息 (通过则返回 null)
 * @param {Array} draft 扁平草稿
 * @returns {string|null}
 */
export function validateDraft(draft) {
  const byId = new Map();
  for (const item of draft) {
    byId.set(item.id, item);
  }
  for (const item of draft) {
    if (!Number.isInteger(item.level) || item.level < MIN_LEVEL || item.level > MAX_LEVEL) {
      return `章节「${item.title}」层级超出范围 (${MIN_LEVEL}~${MAX_LEVEL})`;
    }
    if (item.is_disabled !== 0 && item.is_disabled !== 1) {
      return `章节「${item.title}」的禁用状态非法`;
    }
    if (item.parent_id) {
      const parent = byId.get(item.parent_id);
      if (!parent) {
        return `章节「${item.title}」的父节点不存在`;
      }
      if (parent.chapter_index >= item.chapter_index) {
        return `章节「${item.title}」的父节点必须在它之前`;
      }
      if (parent.level >= item.level) {
        return `章节「${item.title}」的层级必须大于其父节点「${parent.title}」`;
      }
    }
  }
  return null;
}

/**
 * 计算每个章节在树中的深度 (沿 parent_id 向上的层数), 用于缩进展示。
 * 父节点总在子节点之前, 因此一次顺序遍历即可。
 * @param {Array} draft 扁平草稿
 * @returns {Map<string, number>} id -> 深度
 */
export function computeDepths(draft) {
  const depths = new Map();
  for (const item of draft) {
    const parentDepth = item.parent_id ? depths.get(item.parent_id) : undefined;
    depths.set(item.id, parentDepth === undefined ? 0 : parentDepth + 1);
  }
  return depths;
}

/**
 * 用 AI 预览结果覆盖草稿的 level / parent_id / is_disabled
 * 预览中不存在于草稿的 id 会被忽略, 草稿中缺失的章节保持原状。
 * @param {Array} draft 扁平草稿 (原地修改)
 * @param {Array} suggestions 预览接口返回的 chapters
 */
export function applySuggestions(draft, suggestions) {
  const map = new Map();
  for (const s of suggestions || []) {
    map.set(s.id, s);
  }
  for (const item of draft) {
    const s = map.get(item.id);
    if (!s) continue;
    item.level = s.level;
    item.parent_id = s.parent_id ?? null;
    item.is_disabled = s.is_disabled ? 1 : 0;
  }
}

/**
 * 生成提交给保存接口的请求体 (仅 id / level / parent_id / is_disabled)
 * @param {Array} draft 扁平草稿
 */
export function toPayload(draft) {
  return draft.map(item => ({
    id: item.id,
    level: item.level,
    parent_id: item.parent_id,
    is_disabled: item.is_disabled
  }));
}

/**
 * 生成"已保存状态"快照, 用于判断哪些章节被修改过
 * @param {Array} draft 扁平草稿
 * @returns {Map<string, {level, parent_id, is_disabled}>}
 */
export function snapshotDraft(draft) {
  const map = new Map();
  for (const item of draft) {
    map.set(item.id, {
      level: item.level,
      parent_id: item.parent_id,
      is_disabled: item.is_disabled
    });
  }
  return map;
}

/**
 * 判断某个章节相对快照是否被修改
 * @param {object} item 草稿项
 * @param {Map} snapshot snapshotDraft 的结果
 */
export function isItemChanged(item, snapshot) {
  const origin = snapshot.get(item.id);
  if (!origin) return true;
  return (
    origin.level !== item.level ||
    origin.parent_id !== item.parent_id ||
    origin.is_disabled !== item.is_disabled
  );
}
