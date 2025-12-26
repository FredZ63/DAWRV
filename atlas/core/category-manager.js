/**
 * ATLAS Category Manager
 * Provides category management and helper functions
 */

const CategoryConfig = require('./category-config.js');

class CategoryManager {
    /**
     * Auto-detect patch category from name and tags
     */
    static detectPatchCategory(name, tags = []) {
        return CategoryConfig.detectPatchCategory(name, tags);
    }

    /**
     * Get patch category info
     */
    static getPatchCategoryInfo(category) {
        return CategoryConfig.getPatchCategoryInfo(category);
    }

    /**
     * Get plugin category info
     */
    static getPluginCategoryInfo(category) {
        return CategoryConfig.getPluginCategoryInfo(category);
    }

    /**
     * Get all patch categories
     */
    static getAllPatchCategories() {
        return CategoryConfig.getAllPatchCategories();
    }

    /**
     * Get all plugin categories
     */
    static getAllPluginCategories() {
        return CategoryConfig.getAllPluginCategories();
    }

    /**
     * Get all genres
     */
    static getGenres() {
        return CategoryConfig.GENRES;
    }

    /**
     * Get all moods
     */
    static getMoods() {
        return CategoryConfig.MOODS;
    }

    /**
     * Get all tempo ranges
     */
    static getTempoRanges() {
        return CategoryConfig.TEMPO_RANGES;
    }

    /**
     * Get all complexity levels
     */
    static getComplexityLevels() {
        return CategoryConfig.COMPLEXITY_LEVELS;
    }

    /**
     * Validate category
     */
    static validatePatchCategory(category) {
        const validCategories = this.getAllPatchCategories();
        return validCategories.includes(category);
    }

    /**
     * Validate plugin category
     */
    static validatePluginCategory(category) {
        const validCategories = this.getAllPluginCategories();
        return validCategories.includes(category);
    }

    /**
     * Suggest category based on patch data
     */
    static suggestCategory(patchData) {
        if (patchData.category && patchData.category !== 'Uncategorized') {
            return patchData.category;
        }

        return this.detectPatchCategory(patchData.name, patchData.tags);
    }

    /**
     * Get category statistics from patches
     */
    static getCategoryStats(patches) {
        const stats = {};
        
        patches.forEach(patch => {
            const category = patch.category || 'Uncategorized';
            stats[category] = (stats[category] || 0) + 1;
        });

        return stats;
    }

    /**
     * Get most used categories
     */
    static getMostUsedCategories(patches, limit = 10) {
        const stats = this.getCategoryStats(patches);
        return Object.entries(stats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([category, count]) => ({ category, count }));
    }
}

module.exports = CategoryManager;

