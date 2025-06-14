const { validationResult } = require("express-validator");
const CustomerService = require("../services/customers");
const TagService = require("../services/tags");

class CustomerController {
  // 获取客户列表
  static async getCustomers(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const filters = {
        page: parseInt(req.query.page) || 1,
        per_page: Math.min(parseInt(req.query.per_page) || 20, 50),
        search: req.query.search,
        tags: req.query.tags ? req.query.tags.split(",") : undefined,
      };

      const result = await CustomerService.getList(filters);

      res.json({
        success: true,
        data: {
          customers: result.data,
          meta: result.meta,
        },
      });
    } catch (error) {
      console.error("Get customers error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取客户列表失败",
        },
      });
    }
  }

  // 获取客户详情
  static async getCustomer(req, res) {
    try {
      const { customerId } = req.params;

      const customer = await CustomerService.getById(customerId);

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "客户不存在",
          },
        });
      }

      res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      console.error("Get customer error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取客户详情失败",
        },
      });
    }
  }

  // 编辑客户
  static async updateCustomer(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const { customerId } = req.params;
      const updateData = req.body;

      const customer = await CustomerService.update(customerId, updateData);

      res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      console.error("Update customer error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "更新客户信息失败",
        },
      });
    }
  }

  // 获取客户历史会话
  static async getCustomerConversations(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const { customerId } = req.params;
      const filters = {
        page: parseInt(req.query.page) || 1,
        per_page: Math.min(parseInt(req.query.per_page) || 20, 50),
      };

      const result = await CustomerService.getConversations(customerId, filters);

      res.json({
        success: true,
        data: {
          conversations: result.data,
          meta: result.meta,
        },
      });
    } catch (error) {
      console.error("Get customer conversations error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取客户会话历史失败",
        },
      });
    }
  }

  // 添加/移除标签
  static async manageTags(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const { customerId } = req.params;
      const { tags, action } = req.body; // action: 'add' | 'remove'

      const customer = await CustomerService.manageTags(customerId, tags, action);

      res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      console.error("Manage customer tags error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "管理客户标签失败",
        },
      });
    }
  }

  // 获取客户标签
  static async getCustomerTags(req, res) {
    try {
      const customerId = parseInt(req.params.id);
      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CUSTOMER_ID",
            message: "无效的客户ID",
          },
        });
      }

      const tags = await TagService.getCustomerTags(customerId);

      res.json({
        success: true,
        data: { tags },
      });
    } catch (error) {
      console.error("Get customer tags error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取客户标签失败",
        },
      });
    }
  }

  // 设置客户标签
  static async setCustomerTags(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求参数无效",
            details: errors.array(),
          },
        });
      }

      const customerId = parseInt(req.params.id);
      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CUSTOMER_ID",
            message: "无效的客户ID",
          },
        });
      }

      const { tags } = req.body;
      await TagService.setCustomerTags(customerId, tags);
      const updatedTags = await TagService.getCustomerTags(customerId);

      res.json({
        success: true,
        data: { tags: updatedTags },
        message: "客户标签设置成功",
      });
    } catch (error) {
      console.error("Set customer tags error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "设置客户标签失败",
        },
      });
    }
  }

  // 删除客户标签
  static async removeCustomerTag(req, res) {
    try {
      const customerId = parseInt(req.params.id);
      const tagName = req.params.tagName;

      if (!customerId || !tagName) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETERS",
            message: "无效的客户ID或标签名称",
          },
        });
      }

      const removed = await TagService.removeFromCustomer(customerId, tagName);
      if (!removed) {
        return res.status(404).json({
          success: false,
          error: {
            code: "TAG_NOT_FOUND",
            message: "客户标签不存在",
          },
        });
      }

      res.json({
        success: true,
        message: "客户标签删除成功",
      });
    } catch (error) {
      console.error("Remove customer tag error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "删除客户标签失败",
        },
      });
    }
  }

  // 获取客户统计
  static async getCustomerStats(req, res) {
    try {
      const stats = await CustomerService.getStats();

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      console.error("Get customer stats error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取客户统计失败",
        },
      });
    }
  }
}

module.exports = CustomerController;