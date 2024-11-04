<script lang="ts">
import { getCurrentInstance, computed } from "vue";
import { setTranslateNamespace } from "../stores/translate";

export type TranslateNamespaceProps = {
    path: string;
};

export default {
  props: {
    path: { type: String, required: true }
  },
  setup(props) {
    const instance: any = getCurrentInstance();
    const path = computed(() => props.path);
    setTranslateNamespace(path, instance);
  },
  render() {
    return this.$slots.default({});
  }
};


</script>