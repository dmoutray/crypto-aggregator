
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    // (1:0) <script>   let coin1 = "bitcoin";   let coin1PurchasePrice = 0;   let coin1Amount = 0;   let coin2 = "cardano";   let coin2PurchasePrice = 0;   let coin2Amount = 0;    let currency1 = "gbp";   let currency2 = "usd";    $: currentInvestmentValue = 0;    $: data = fetch(     `https://api.coingecko.com/api/v3/simple/price?ids=${       coin1 + "%2C" + coin2     }
    function create_catch_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script>   let coin1 = \\\"bitcoin\\\";   let coin1PurchasePrice = 0;   let coin1Amount = 0;   let coin2 = \\\"cardano\\\";   let coin2PurchasePrice = 0;   let coin2Amount = 0;    let currency1 = \\\"gbp\\\";   let currency2 = \\\"usd\\\";    $: currentInvestmentValue = 0;    $: data = fetch(     `https://api.coingecko.com/api/v3/simple/price?ids=${       coin1 + \\\"%2C\\\" + coin2     }",
    		ctx
    	});

    	return block;
    }

    // (50:26)      <table>       <th>coin</th>       <th>£ gbp</th>       <th>$ usd</th>       {#each Object.keys(value) as key}
    function create_then_block(ctx) {
    	let table;
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;
    	let t5;
    	let each_value = Object.keys(/*value*/ ctx[17]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			table = element("table");
    			th0 = element("th");
    			th0.textContent = "coin";
    			t1 = space();
    			th1 = element("th");
    			th1.textContent = "£ gbp";
    			t3 = space();
    			th2 = element("th");
    			th2.textContent = "$ usd";
    			t5 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(th0, file, 51, 6, 1328);
    			add_location(th1, file, 52, 6, 1348);
    			add_location(th2, file, 53, 6, 1369);
    			attr_dev(table, "class", "svelte-eqwci");
    			add_location(table, file, 50, 4, 1314);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, th0);
    			append_dev(table, t1);
    			append_dev(table, th1);
    			append_dev(table, t3);
    			append_dev(table, th2);
    			append_dev(table, t5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data, Object, currency2, currency1*/ 1664) {
    				each_value = Object.keys(/*value*/ ctx[17]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(table, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(50:26)      <table>       <th>coin</th>       <th>£ gbp</th>       <th>$ usd</th>       {#each Object.keys(value) as key}",
    		ctx
    	});

    	return block;
    }

    // (55:6) {#each Object.keys(value) as key}
    function create_each_block(ctx) {
    	let tr;
    	let t0_value = /*key*/ ctx[18] + "";
    	let t0;
    	let t1;
    	let td0;
    	let t2_value = /*value*/ ctx[17][/*key*/ ctx[18]][/*currency1*/ ctx[9]] + "";
    	let t2;
    	let t3;
    	let td1;
    	let t4;
    	let t5_value = /*value*/ ctx[17][/*key*/ ctx[18]][/*currency2*/ ctx[10]] + "";
    	let t5;
    	let t6;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			t0 = text(t0_value);
    			t1 = space();
    			td0 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td1 = element("td");
    			t4 = text("$");
    			t5 = text(t5_value);
    			t6 = space();
    			attr_dev(td0, "class", "svelte-eqwci");
    			add_location(td0, file, 57, 10, 1463);
    			attr_dev(td1, "class", "svelte-eqwci");
    			add_location(td1, file, 58, 10, 1506);
    			add_location(tr, file, 55, 8, 1432);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td0);
    			append_dev(td0, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td1);
    			append_dev(td1, t4);
    			append_dev(td1, t5);
    			append_dev(tr, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 128 && t0_value !== (t0_value = /*key*/ ctx[18] + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*data*/ 128 && t2_value !== (t2_value = /*value*/ ctx[17][/*key*/ ctx[18]][/*currency1*/ ctx[9]] + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*data*/ 128 && t5_value !== (t5_value = /*value*/ ctx[17][/*key*/ ctx[18]][/*currency2*/ ctx[10]] + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(55:6) {#each Object.keys(value) as key}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script>   let coin1 = "bitcoin";   let coin1PurchasePrice = 0;   let coin1Amount = 0;   let coin2 = "cardano";   let coin2PurchasePrice = 0;   let coin2Amount = 0;    let currency1 = "gbp";   let currency2 = "usd";    $: currentInvestmentValue = 0;    $: data = fetch(     `https://api.coingecko.com/api/v3/simple/price?ids=${       coin1 + "%2C" + coin2     }
    function create_pending_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(1:0) <script>   let coin1 = \\\"bitcoin\\\";   let coin1PurchasePrice = 0;   let coin1Amount = 0;   let coin2 = \\\"cardano\\\";   let coin2PurchasePrice = 0;   let coin2Amount = 0;    let currency1 = \\\"gbp\\\";   let currency2 = \\\"usd\\\";    $: currentInvestmentValue = 0;    $: data = fetch(     `https://api.coingecko.com/api/v3/simple/price?ids=${       coin1 + \\\"%2C\\\" + coin2     }",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let h20;
    	let t2;
    	let t3;
    	let t4;
    	let h21;
    	let t5;
    	let t6;
    	let t7;
    	let label0;
    	let t8;
    	let input0;
    	let t9;
    	let input1;
    	let t10;
    	let input2;
    	let t11;
    	let label1;
    	let t12;
    	let input3;
    	let t13;
    	let input4;
    	let t14;
    	let input5;
    	let t15;
    	let promise;
    	let mounted;
    	let dispose;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 17
    	};

    	handle_promise(promise = /*data*/ ctx[7], info);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Investment Aggre-gator 🐊";
    			t1 = space();
    			h20 = element("h2");
    			t2 = text("Total Invested: ");
    			t3 = text(/*totalInvested*/ ctx[8]);
    			t4 = space();
    			h21 = element("h2");
    			t5 = text("Current investment value: ");
    			t6 = text(/*currentInvestmentValue*/ ctx[6]);
    			t7 = space();
    			label0 = element("label");
    			t8 = text("coin 1\n    ");
    			input0 = element("input");
    			t9 = space();
    			input1 = element("input");
    			t10 = space();
    			input2 = element("input");
    			t11 = space();
    			label1 = element("label");
    			t12 = text("coin 2\n    ");
    			input3 = element("input");
    			t13 = space();
    			input4 = element("input");
    			t14 = space();
    			input5 = element("input");
    			t15 = space();
    			info.block.c();
    			attr_dev(h1, "class", "svelte-eqwci");
    			add_location(h1, file, 31, 2, 760);
    			add_location(h20, file, 32, 2, 797);
    			add_location(h21, file, 33, 2, 840);
    			attr_dev(input0, "type", "text");
    			add_location(input0, file, 37, 4, 926);
    			attr_dev(input1, "type", "number");
    			add_location(input1, file, 38, 4, 971);
    			attr_dev(input2, "type", "number");
    			add_location(input2, file, 39, 4, 1024);
    			add_location(label0, file, 35, 2, 903);
    			attr_dev(input3, "type", "text");
    			add_location(input3, file, 44, 4, 1117);
    			attr_dev(input4, "type", "number");
    			add_location(input4, file, 45, 4, 1162);
    			attr_dev(input5, "type", "number");
    			add_location(input5, file, 46, 4, 1215);
    			add_location(label1, file, 42, 2, 1094);
    			attr_dev(main, "class", "svelte-eqwci");
    			add_location(main, file, 30, 0, 751);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, h20);
    			append_dev(h20, t2);
    			append_dev(h20, t3);
    			append_dev(main, t4);
    			append_dev(main, h21);
    			append_dev(h21, t5);
    			append_dev(h21, t6);
    			append_dev(main, t7);
    			append_dev(main, label0);
    			append_dev(label0, t8);
    			append_dev(label0, input0);
    			set_input_value(input0, /*coin1*/ ctx[0]);
    			append_dev(label0, t9);
    			append_dev(label0, input1);
    			set_input_value(input1, /*coin1Amount*/ ctx[2]);
    			append_dev(label0, t10);
    			append_dev(label0, input2);
    			set_input_value(input2, /*coin1PurchasePrice*/ ctx[1]);
    			append_dev(main, t11);
    			append_dev(main, label1);
    			append_dev(label1, t12);
    			append_dev(label1, input3);
    			set_input_value(input3, /*coin2*/ ctx[3]);
    			append_dev(label1, t13);
    			append_dev(label1, input4);
    			set_input_value(input4, /*coin2Amount*/ ctx[5]);
    			append_dev(label1, t14);
    			append_dev(label1, input5);
    			set_input_value(input5, /*coin2PurchasePrice*/ ctx[4]);
    			append_dev(main, t15);
    			info.block.m(main, info.anchor = null);
    			info.mount = () => main;
    			info.anchor = null;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[11]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[12]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[13]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[14]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[15]),
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[16])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*totalInvested*/ 256) set_data_dev(t3, /*totalInvested*/ ctx[8]);
    			if (dirty & /*currentInvestmentValue*/ 64) set_data_dev(t6, /*currentInvestmentValue*/ ctx[6]);

    			if (dirty & /*coin1*/ 1 && input0.value !== /*coin1*/ ctx[0]) {
    				set_input_value(input0, /*coin1*/ ctx[0]);
    			}

    			if (dirty & /*coin1Amount*/ 4 && to_number(input1.value) !== /*coin1Amount*/ ctx[2]) {
    				set_input_value(input1, /*coin1Amount*/ ctx[2]);
    			}

    			if (dirty & /*coin1PurchasePrice*/ 2 && to_number(input2.value) !== /*coin1PurchasePrice*/ ctx[1]) {
    				set_input_value(input2, /*coin1PurchasePrice*/ ctx[1]);
    			}

    			if (dirty & /*coin2*/ 8 && input3.value !== /*coin2*/ ctx[3]) {
    				set_input_value(input3, /*coin2*/ ctx[3]);
    			}

    			if (dirty & /*coin2Amount*/ 32 && to_number(input4.value) !== /*coin2Amount*/ ctx[5]) {
    				set_input_value(input4, /*coin2Amount*/ ctx[5]);
    			}

    			if (dirty & /*coin2PurchasePrice*/ 16 && to_number(input5.value) !== /*coin2PurchasePrice*/ ctx[4]) {
    				set_input_value(input5, /*coin2PurchasePrice*/ ctx[4]);
    			}

    			info.ctx = ctx;

    			if (dirty & /*data*/ 128 && promise !== (promise = /*data*/ ctx[7]) && handle_promise(promise, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			info.block.d();
    			info.token = null;
    			info = null;
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let currentInvestmentValue;
    	let data;
    	let totalInvested;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let coin1 = "bitcoin";
    	let coin1PurchasePrice = 0;
    	let coin1Amount = 0;
    	let coin2 = "cardano";
    	let coin2PurchasePrice = 0;
    	let coin2Amount = 0;
    	let currency1 = "gbp";
    	let currency2 = "usd";
    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		coin1 = this.value;
    		$$invalidate(0, coin1);
    	}

    	function input1_input_handler() {
    		coin1Amount = to_number(this.value);
    		$$invalidate(2, coin1Amount);
    	}

    	function input2_input_handler() {
    		coin1PurchasePrice = to_number(this.value);
    		$$invalidate(1, coin1PurchasePrice);
    	}

    	function input3_input_handler() {
    		coin2 = this.value;
    		$$invalidate(3, coin2);
    	}

    	function input4_input_handler() {
    		coin2Amount = to_number(this.value);
    		$$invalidate(5, coin2Amount);
    	}

    	function input5_input_handler() {
    		coin2PurchasePrice = to_number(this.value);
    		$$invalidate(4, coin2PurchasePrice);
    	}

    	$$self.$capture_state = () => ({
    		coin1,
    		coin1PurchasePrice,
    		coin1Amount,
    		coin2,
    		coin2PurchasePrice,
    		coin2Amount,
    		currency1,
    		currency2,
    		currentInvestmentValue,
    		data,
    		totalInvested
    	});

    	$$self.$inject_state = $$props => {
    		if ("coin1" in $$props) $$invalidate(0, coin1 = $$props.coin1);
    		if ("coin1PurchasePrice" in $$props) $$invalidate(1, coin1PurchasePrice = $$props.coin1PurchasePrice);
    		if ("coin1Amount" in $$props) $$invalidate(2, coin1Amount = $$props.coin1Amount);
    		if ("coin2" in $$props) $$invalidate(3, coin2 = $$props.coin2);
    		if ("coin2PurchasePrice" in $$props) $$invalidate(4, coin2PurchasePrice = $$props.coin2PurchasePrice);
    		if ("coin2Amount" in $$props) $$invalidate(5, coin2Amount = $$props.coin2Amount);
    		if ("currency1" in $$props) $$invalidate(9, currency1 = $$props.currency1);
    		if ("currency2" in $$props) $$invalidate(10, currency2 = $$props.currency2);
    		if ("currentInvestmentValue" in $$props) $$invalidate(6, currentInvestmentValue = $$props.currentInvestmentValue);
    		if ("data" in $$props) $$invalidate(7, data = $$props.data);
    		if ("totalInvested" in $$props) $$invalidate(8, totalInvested = $$props.totalInvested);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*coin1, coin2, coin1Amount, coin1PurchasePrice, coin2PurchasePrice*/ 31) {
    			$$invalidate(7, data = fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin1 + "%2C" + coin2}&vs_currencies=${currency1 + "%2C" + currency2}`).then(response => response.json()).then(result => {
    				$$invalidate(6, currentInvestmentValue = (coin1Amount * (coin1PurchasePrice / result.bitcoin?.gbp) + coin1Amount * (coin2PurchasePrice / result.cardano?.gbp)).toFixed(2));
    				return result;
    			}));
    		}

    		if ($$self.$$.dirty & /*coin1Amount, coin2Amount*/ 36) {
    			$$invalidate(8, totalInvested = coin1Amount + coin2Amount);
    		}
    	};

    	$$invalidate(6, currentInvestmentValue = 0);

    	return [
    		coin1,
    		coin1PurchasePrice,
    		coin1Amount,
    		coin2,
    		coin2PurchasePrice,
    		coin2Amount,
    		currentInvestmentValue,
    		data,
    		totalInvested,
    		currency1,
    		currency2,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		input5_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
