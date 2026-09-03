/**
 * Pre-loaded standard GATE Syllabi for all major engineering streams
 * Follows official GATE syllabus standards.
 */

import { GateBranch, Subject } from './types';

// Helper to generate unique IDs
const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).substring(2, 9)}`;

// Color palettes for subjects
const SUBJECT_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#0ea5e9', // Sky
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#10b981', // Emerald
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#a855f7', // Purple
  '#8b5cf6', // Violet
];

function buildSubject(
  name: string,
  code: string,
  topicsData: { name: string; subtopics: string[] }[],
  colorIndex = 0
): Subject {
  const subId = makeId(`sub_${code.toLowerCase()}`);
  return {
    id: subId,
    name,
    code,
    color: SUBJECT_COLORS[colorIndex % SUBJECT_COLORS.length],
    isCustom: false,
    topics: topicsData.map((t, tIdx) => {
      const topId = `${subId}_top_${tIdx}`;
      return {
        id: topId,
        name: t.name,
        subtopics: t.subtopics.map((st, sIdx) => ({
          id: `${topId}_sub_${sIdx}`,
          name: st,
          covered: false,
          revisionRounds: 0,
          revisionTarget: 3,
        })),
      };
    }),
  };
}

// ----------------------------------------------------------------------
// 1. GATE CS - Computer Science & Information Technology
// ----------------------------------------------------------------------
const SYLLABUS_CS: Subject[] = [
  buildSubject('Engineering Mathematics & Discrete Math', 'MATH-CS', [
    {
      name: 'Discrete Mathematics',
      subtopics: [
        'Propositional & First-Order Logic',
        'Sets, Relations & Equivalence Relations',
        'Functions, Partial Orders & Lattices',
        'Monoids, Groups & Group Theory',
        'Combinatorics & Counting Principles',
        'Generating Functions & Recurrence Relations',
        'Graph Theory: Connectivity, Matching, Coloring',
      ],
    },
    {
      name: 'Linear Algebra',
      subtopics: [
        'Matrices & Determinants',
        'Systems of Linear Equations',
        'Eigenvalues & Eigenvectors',
        'LU Decomposition & Vector Spaces',
      ],
    },
    {
      name: 'Calculus',
      subtopics: [
        'Limits, Continuity & Differentiability',
        'Maxima and Minima',
        'Mean Value Theorem & Taylor Series',
        'Definite & Indefinite Integrals',
      ],
    },
    {
      name: 'Probability & Statistics',
      subtopics: [
        'Random Variables & Probability Distributions',
        'Uniform, Normal, Exponential, Poisson, Binomial Distributions',
        'Mean, Median, Mode & Standard Deviation',
        'Conditional Probability & Bayes Theorem',
      ],
    },
  ], 0),

  buildSubject('Digital Logic', 'DL', [
    {
      name: 'Boolean Algebra & Minimization',
      subtopics: [
        'Boolean Identities & Canonical Forms',
        'Logic Gates & Universal Logic',
        'Karnaugh Maps (K-Maps) Minimization',
        'Tabular Minimization (Quine-McCluskey Method) & Hazards',
      ],
    },
    {
      name: 'Combinational Circuits',
      subtopics: [
        'Adders, Subtractors & Carry Look-Ahead',
        'Multiplexers & Demultiplexers',
        'Decoders & Encoders (Priority Encoders)',
        'Magnitude Comparators & Code Converters',
      ],
    },
    {
      name: 'Sequential Circuits',
      subtopics: [
        'Latches & Flip-Flops (SR, JK, D, T)',
        'Timing Analysis (Setup & Hold Time)',
        'Synchronous & Asynchronous Counters',
        'Shift Registers & State Machine Design',
      ],
    },
    {
      name: 'Number Representations',
      subtopics: [
        'Binary, Octal, Hexadecimal & BCD',
        '1s & 2s Complement Arithmetic',
        'IEEE 754 Floating Point Standard (Single & Double)',
      ],
    },
  ], 1),

  buildSubject('Computer Organization & Architecture', 'COA', [
    {
      name: 'Instruction Set Architecture & CPU',
      subtopics: [
        'Machine Instructions & Addressing Modes',
        'ALU Design & Data Path Operations',
        'Hardwired & Microprogrammed Control Unit',
        'RISC vs CISC Architecture',
      ],
    },
    {
      name: 'Instruction Pipelining',
      subtopics: [
        'Pipelining Basics & Speedup Calculations',
        'Structural, Data & Control Hazards',
        'Branch Prediction & Forwarding Techniques',
      ],
    },
    {
      name: 'Memory Hierarchy',
      subtopics: [
        'Cache Memory: Direct, Associative, Set-Associative Mapping',
        'Cache Replacement Policies & Write Policies',
        'Average Memory Access Time (AMAT) & Multilevel Cache',
        'Main Memory Organization & Interleaving',
        'Virtual Memory & Page Table Walk',
      ],
    },
    {
      name: 'I/O Interface',
      subtopics: [
        'Programmed I/O, Interrupt Driven I/O',
        'Direct Memory Access (DMA) & Controller',
      ],
    },
  ], 2),

  buildSubject('Programming & Data Structures', 'PDS', [
    {
      name: 'Programming in C',
      subtopics: [
        'Data Types, Operators & Precedence',
        'Control Flow (Loops & Conditionals)',
        'Functions, Parameter Passing & Scope',
        'Recursion & Call Stack Behavior',
        'Pointers, Dynamic Memory & Memory Allocation',
        'Structures, Unions & File Operations',
      ],
    },
    {
      name: 'Linear Data Structures',
      subtopics: [
        'Arrays & Multi-dimensional Addressing',
        'Singly, Doubly & Circular Linked Lists',
        'Stacks: Expressions (Infix, Postfix, Prefix) Evaluation',
        'Queues, Circular Queues & Priority Queues',
      ],
    },
    {
      name: 'Non-Linear Data Structures',
      subtopics: [
        'Binary Trees: Traversals (Inorder, Preorder, Postorder)',
        'Binary Search Trees (BST) & Operations',
        'AVL Trees & Rotations',
        'Binary Heaps (Min/Max Heap) & Heapify',
        'Graphs: Representations (Matrix, Adjacency List)',
      ],
    },
  ], 3),

  buildSubject('Algorithms', 'ALGO', [
    {
      name: 'Asymptotic Analysis & Recurrences',
      subtopics: [
        'Time & Space Complexity (Big-O, Omega, Theta)',
        'Master Theorem & Substitution Method',
        'Recursion Tree Method & Akra-Bazzi',
      ],
    },
    {
      name: 'Searching & Sorting',
      subtopics: [
        'Comparison Sorts: QuickSort, MergeSort, HeapSort',
        'Linear Sorts: Counting Sort, Radix Sort, Bucket Sort',
        'Binary Search & Order Statistics / QuickSelect',
      ],
    },
    {
      name: 'Algorithm Design Paradigms',
      subtopics: [
        'Greedy Algorithms: Huffman, Knapsack, Interval Scheduling',
        'Divide and Conquer: Matrix Multiplication, Closest Pair',
        'Dynamic Programming: LCS, LIS, Matrix Chain, 0/1 Knapsack',
      ],
    },
    {
      name: 'Graph Algorithms',
      subtopics: [
        'BFS & DFS Traversals & Applications',
        'Topological Sort & Strongly Connected Components (Kosaraju)',
        'Minimum Spanning Tree (Prim & Kruskal with Disjoint Set)',
        'Single Source Shortest Path (Dijkstra, Bellman-Ford)',
        'All-Pairs Shortest Path (Floyd-Warshall)',
      ],
    },
  ], 4),

  buildSubject('Theory of Computation', 'TOC', [
    {
      name: 'Regular Languages & Finite Automata',
      subtopics: [
        'DFA, NFA & Epsilon-NFA Equivalences',
        'Minimization of DFA (Table Filling / Myhill-Nerode)',
        'Regular Expressions & Identities',
        'Pumping Lemma for Regular Languages',
        'Closure & Decidability Properties of Regular Languages',
      ],
    },
    {
      name: 'Context-Free Languages & Pushdown Automata',
      subtopics: [
        'Context-Free Grammars (CFG) & Derivation Trees',
        'Ambiguity in Grammars & Chomsky Normal Form (CNF)',
        'Pushdown Automata (DPDA vs NPDA)',
        'Pumping Lemma for CFLs',
        'Closure & Decidability Properties of CFLs/DCFLs',
      ],
    },
    {
      name: 'Turing Machines & Undecidability',
      subtopics: [
        'Turing Machine Design & Computability',
        'Recursive vs Recursively Enumerable Languages',
        'Halting Problem & Undecidability Proofs',
        'Rice Theorem & Post Correspondence Problem (PCP)',
      ],
    },
  ], 5),

  buildSubject('Compiler Design', 'CD', [
    {
      name: 'Lexical Analysis',
      subtopics: [
        'Tokens, Patterns, Lexemes & Regular Expressions',
        'Lexical Analyzer Generator & Input Buffering',
      ],
    },
    {
      name: 'Syntax Analysis / Parsing',
      subtopics: [
        'Top-Down Parsing: LL(1) Parsing Table & FIRST/FOLLOW',
        'Bottom-Up Parsing: LR(0), SLR(1), LALR(1), CLR(1)',
        'Operator Precedence Parsing & Conflict Resolution',
      ],
    },
    {
      name: 'Syntax-Directed Translation & Code Gen',
      subtopics: [
        'S-Attributed and L-Attributed SDD/SDT',
        'Intermediate Code: 3-Address Code, Quadruples, Triples',
        'Runtime Storage Administration & Activation Records',
        'Basic Blocks, Flow Graphs & Local Code Optimization',
        'Register Allocation & Data Flow Analysis',
      ],
    },
  ], 6),

  buildSubject('Operating Systems', 'OS', [
    {
      name: 'Processes & Threads',
      subtopics: [
        'Process States, PCB, Context Switch',
        'System Calls: fork(), exec(), wait(), exit()',
        'Threads & Multithreading Models',
        'Inter-Process Communication (Pipes, Shared Memory, Message Queues)',
      ],
    },
    {
      name: 'CPU Scheduling & Synchronization',
      subtopics: [
        'Scheduling: FCFS, SJF, SRTF, Round Robin, Priority, Multilevel',
        'Critical Section Problem & Peterson Solution',
        'Semaphores, Mutexes & Condition Variables',
        'Classic Synchronization Problems (Producer-Consumer, Reader-Writer, Dining Philosophers)',
      ],
    },
    {
      name: 'Deadlocks',
      subtopics: [
        'Deadlock Necessary Conditions & Resource Allocation Graph',
        'Deadlock Prevention & Avoidance (Banker Algorithm)',
        'Deadlock Detection & Recovery',
      ],
    },
    {
      name: 'Memory Management',
      subtopics: [
        'Contiguous Allocation: First Fit, Best Fit, Worst Fit',
        'Paging, Multi-level Paging, Inverted Page Table',
        'Translation Lookaside Buffer (TLB) & Effective Access Time',
        'Segmentation & Paged Segmentation',
        'Virtual Memory: Page Replacement (FIFO, LRU, Optimal, Clock)',
        'Thrashing & Working Set Model',
      ],
    },
    {
      name: 'File & Disk Management',
      subtopics: [
        'File Organization, Directory Structures & Inodes',
        'Allocation Methods: Contiguous, Linked, Indexed',
        'Disk Scheduling: FCFS, SSTF, SCAN, C-SCAN, LOOK, C-LOOK',
      ],
    },
  ], 7),

  buildSubject('Databases (DBMS)', 'DBMS', [
    {
      name: 'ER Model & Relational Model',
      subtopics: [
        'Entity-Relationship Diagrams & Mapping to Tables',
        'Relational Algebra Operations & SQL Translation',
        'Tuple Relational Calculus & Domain Relational Calculus',
      ],
    },
    {
      name: 'SQL & Integrity Constraints',
      subtopics: [
        'DDL, DML, DCL & TCL Commands',
        'Complex SQL Queries: Joins, Nested Subqueries, Aggregations',
        'Key Constraints, Foreign Keys & Referential Integrity',
      ],
    },
    {
      name: 'Database Design & Normalization',
      subtopics: [
        'Functional Dependencies & Closure of Attributes',
        'Canonical Cover & Minimal Cover',
        'Lossless Join Decomposition & Dependency Preservation',
        'Normal Forms: 1NF, 2NF, 3NF, BCNF, 4NF',
      ],
    },
    {
      name: 'Transactions & Concurrency Control',
      subtopics: [
        'ACID Properties & Transaction States',
        'Schedules: Conflict & View Serializability',
        'Recoverable, Cascadeless & Strict Schedules',
        'Concurrency Protocols: 2PL (Strict, Rigorous), Timestamp Ordering',
        'Deadlock in Transactions & Lock Conversion',
      ],
    },
    {
      name: 'Storage & Indexing',
      subtopics: [
        'File Organization & Record Formats',
        'Primary, Secondary, Clustered & Dense/Sparse Indices',
        'B-Trees and B+ Trees: Insertion, Deletion, Height & Order Calculation',
      ],
    },
  ], 8),

  buildSubject('Computer Networks', 'CN', [
    {
      name: 'Layering & Physical/Data Link Layer',
      subtopics: [
        'OSI & TCP/IP Reference Models',
        'Framing, Error Detection (CRC, Checksum, Hamming Code)',
        'Flow Control: Stop-and-Wait, Go-Back-N, Selective Repeat ARQ',
        'Multiple Access: Pure & Slotted ALOHA, CSMA/CD, CSMA/CA',
        'Ethernet (IEEE 802.3), Bridges, Switches & VLANs',
      ],
    },
    {
      name: 'Network Layer',
      subtopics: [
        'IPv4 Header Format, Fragmentation & Addressing',
        'IPv4 Classless Inter-Domain Routing (CIDR), Subnetting & Supernetting',
        'Network Address Translation (NAT) & its Types',
        'Routing Algorithms: Distance Vector (Bellman-Ford), Link State (Dijkstra)',
        'Routing Protocols: RIP, OSPF, BGP',
        'Domain Name System (DNS): Resolution, Records & Hierarchy',
      ],
    },
    {
      name: 'Transport Layer',
      subtopics: [
        'TCP: 3-Way Handshake, Connection Teardown, Sliding Window Flow Control',
        'TCP Congestion Control: Slow Start, AIMD, Fast Retransmit, Fast Recovery',
        'UDP: Connectionless Datagram Service & Use Cases',
      ],
    },
    {
      name: 'Application Layer & Network Security',
      subtopics: [
        'HTTP / HTTPS (Request/Response, Methods, Headers, Cookies)',
        'Cryptography: Symmetric vs Asymmetric (RSA, DES, AES)',
        'Digital Signatures, Certificates & Public Key Infrastructure',
        'Firewalls, Packet Filters & TLS/SSL',
      ],
    },
  ], 9),

  buildSubject('General Aptitude', 'GA', [
    {
      name: 'Verbal Aptitude',
      subtopics: [
        'Basic English Grammar & Vocabulary',
        'Reading Comprehension & Critical Reasoning',
        'Sentence Completion & Verbal Analogies',
      ],
    },
    {
      name: 'Quantitative Aptitude',
      subtopics: [
        'Percentages, Profit & Loss, Simple & Compound Interest',
        'Ratio, Proportion, Mixture & Allegation',
        'Time, Speed, Distance & Work/Time',
        'Permutations, Combinations & Probability',
        'Geometry, Mensuration & Elementary Algebra',
      ],
    },
    {
      name: 'Analytical & Spatial Aptitude',
      subtopics: [
        'Deductive & Inductive Logic, Syllogisms',
        'Data Interpretation: Bar charts, Pie charts, Line plots',
        'Spatial Reasoning: Paper folding, Mirror images, Rotations',
      ],
    },
  ], 10),
];

// ----------------------------------------------------------------------
// 2. GATE DA - Data Science & Artificial Intelligence
// ----------------------------------------------------------------------
const SYLLABUS_DA: Subject[] = [
  buildSubject('Probability and Statistics for AI/DS', 'DA-PROB', [
    {
      name: 'Probability Basics & Random Variables',
      subtopics: [
        'Counting, Axioms of Probability, Conditional Probability, Bayes Theorem',
        'Discrete Random Variables: Bernoulli, Binomial, Poisson, Geometric',
        'Continuous Random Variables: Uniform, Exponential, Gaussian/Normal, t-distribution, Chi-square',
        'Joint, Marginal and Conditional Distributions',
      ],
    },
    {
      name: 'Statistical Inference',
      subtopics: [
        'Expectation, Variance, Covariance and Correlation',
        'Central Limit Theorem, Law of Large Numbers',
        'Confidence Intervals & Hypothesis Testing (z-test, t-test, ANOVA)',
        'Maximum Likelihood Estimation (MLE) and MAP Estimation',
      ],
    },
  ], 0),

  buildSubject('Linear Algebra for AI/DS', 'DA-LA', [
    {
      name: 'Vector Spaces & Matrix Decompositions',
      subtopics: [
        'Vector Spaces, Subspaces, Linear Dependence & Independence',
        'Basis, Dimension, Null Space, Range and Rank-Nullity Theorem',
        'Orthogonality, Gram-Schmidt Orthogonalization, QR Decomposition',
        'Eigenvalues, Eigenvectors, Spectral Theorem',
        'Singular Value Decomposition (SVD) and Principal Component Analysis (PCA)',
      ],
    },
  ], 1),

  buildSubject('Calculus and Optimization', 'DA-CALC', [
    {
      name: 'Multivariate Calculus & Optimization',
      subtopics: [
        'Functions of Single & Multiple Variables, Partial Derivatives',
        'Gradients, Directional Derivatives, Jacobian & Hessian Matrices',
        'Maxima and Minima, Saddle Points, Taylor Expansion',
        'Unconstrained Optimization: Gradient Descent, Stochastic Gradient Descent, Newton Method',
        'Constrained Optimization: Lagrange Multipliers & KKT Conditions',
      ],
    },
  ], 2),

  buildSubject('Programming, Data Structures and Algorithms', 'DA-DSA', [
    {
      name: 'Python Programming & Data Structures',
      subtopics: [
        'Python Basics: Data types, Control Flow, Functions, OOP',
        'NumPy, Pandas and Vectorized Operations',
        'Stacks, Queues, Linked Lists, Trees, Binary Search Trees',
        'Hash Tables, Priority Queues and Binary Heaps',
      ],
    },
    {
      name: 'Algorithms',
      subtopics: [
        'Searching and Sorting Algorithms',
        'Asymptotic Worst/Average-case Analysis',
        'Divide and Conquer, Greedy Algorithms, Dynamic Programming',
        'Graph Traversals: BFS, DFS and Shortest Paths',
      ],
    },
  ], 3),

  buildSubject('Database Management and Warehousing', 'DA-DBMS', [
    {
      name: 'Relational Model, SQL & Warehousing',
      subtopics: [
        'ER Models, Relational Algebra, SQL Queries and Joins',
        'Normalization: 1NF, 2NF, 3NF, BCNF',
        'Indexing: B-Trees, B+ Trees, Hashing',
        'Data Warehousing: Star and Snowflake Schemas, OLAP vs OLTP',
        'Vector Databases and Similarity Search Basics',
      ],
    },
  ], 4),

  buildSubject('Machine Learning', 'DA-ML', [
    {
      name: 'Supervised Learning',
      subtopics: [
        'Linear Regression & Ridge / Lasso Regularization',
        'Logistic Regression & Cross-Entropy Loss',
        'Support Vector Machines (SVM) & Kernel Trick',
        'Decision Trees: ID3, C4.5, CART, Gini Index, Information Gain',
        'Ensemble Methods: Random Forests, Bagging, AdaBoost, Gradient Boosting, XGBoost',
        'k-Nearest Neighbors (k-NN) and Naive Bayes Classifier',
      ],
    },
    {
      name: 'Unsupervised Learning & Evaluation',
      subtopics: [
        'k-Means Clustering, Hierarchical Clustering, DBSCAN',
        'Dimensionality Reduction: PCA, t-SNE',
        'Evaluation Metrics: Precision, Recall, F1-Score, ROC-AUC, Confusion Matrix',
        'Cross-Validation, Bias-Variance Tradeoff, Overfitting/Underfitting',
      ],
    },
  ], 5),

  buildSubject('Artificial Intelligence', 'DA-AI', [
    {
      name: 'Search & Logic',
      subtopics: [
        'Uninformed Search: BFS, DFS, Iterative Deepening',
        'Informed Search: A* Search, Heuristic Functions, Greedy Best-First',
        'Adversarial Search: Minimax Algorithm, Alpha-Beta Pruning',
        'Propositional & First-Order Logic, Inference and Resolution',
      ],
    },
    {
      name: 'Deep Learning & Neural Networks',
      subtopics: [
        'Perceptrons, Multilayer Perceptrons (MLP), Activation Functions',
        'Forward & Backpropagation, Vanishing/Exploding Gradients',
        'Loss Functions and Optimizers (Adam, RMSprop, Momentum)',
        'Convolutional Neural Networks (CNN) Architecture & Pooling',
        'Recurrent Neural Networks (RNN), LSTM, Transformers & Self-Attention Basics',
      ],
    },
  ], 6),

  buildSubject('General Aptitude', 'GA-DA', [
    {
      name: 'Verbal & Quantitative Aptitude',
      subtopics: [
        'Vocabulary & Reading Comprehension',
        'Numerical Ability, Percentages, Ratios, Probability',
        'Logical Reasoning & Data Interpretation',
      ],
    },
  ], 7),
];

// ----------------------------------------------------------------------
// 3. GATE EC - Electronics & Communication Engineering
// ----------------------------------------------------------------------
const SYLLABUS_EC: Subject[] = [
  buildSubject('Engineering Mathematics', 'EC-MATH', [
    {
      name: 'Linear Algebra & Calculus',
      subtopics: [
        'Vector Spaces, Basis, Linear Independence, Matrix Rank',
        'Eigenvalues, Eigenvectors, Cayley-Hamilton Theorem',
        'Multiple Integrals, Gradient, Divergence, Curl, Vector Theorems',
        'Partial Differential Equations & Complex Analysis (Cauchy-Riemann)',
      ],
    },
  ], 0),
  buildSubject('Networks, Signals and Systems', 'EC-NSS', [
    {
      name: 'Network Solution Methods & Theorems',
      subtopics: [
        'Node & Mesh Analysis, Thevenin, Norton, Superposition, Maximum Power',
        'Transient Response of DC & AC Networks, Sinusoidal Steady-State Analysis',
        'Two-port Networks: Z, Y, ABCD, h parameters',
      ],
    },
    {
      name: 'Signals & Systems',
      subtopics: [
        'Continuous & Discrete-time Signals, LTI Systems, Convolution',
        'Fourier Series, Continuous Fourier Transform, Discrete Fourier Transform (DFT/FFT)',
        'Laplace Transform and Z-Transform with Region of Convergence (ROC)',
        'Sampling Theorem and Nyquist Rate',
      ],
    },
  ], 1),
  buildSubject('Electronic Devices & Analog Circuits', 'EC-EDC-AC', [
    {
      name: 'Electronic Devices (EDC)',
      subtopics: [
        'Energy Bands in Intrinsic & Extrinsic Semiconductors, Carrier Transport',
        'PN Junction Diode, Zener Diode, BJT, MOSFET (Characteristics & Physics)',
      ],
    },
    {
      name: 'Analog Circuits',
      subtopics: [
        'Small Signal Equivalent Circuits of Diodes, BJTs and MOSFETs',
        'Simple Diode Circuits: Clipping, Clamping, Rectifiers',
        'Single-Stage & Multistage BJT/MOSFET Amplifiers',
        'Op-Amp Circuits: Inverting/Non-inverting, Integrator, Differentiator, Active Filters, Oscillators',
      ],
    },
  ], 2),
  buildSubject('Digital Circuits & Microprocessors', 'EC-DC', [
    {
      name: 'Digital Logic & Sequential Circuits',
      subtopics: [
        'Number Representations, Combinational Logic Circuits, Minimization',
        'Sequential Circuits: Flip-flops, Counters, Shift Registers',
        'Semiconductor Memories: ROM, SRAM, DRAM, 8085/8086 Microprocessor Basics',
        'A/D and D/A Converters',
      ],
    },
  ], 3),
  buildSubject('Control Systems', 'EC-CS', [
    {
      name: 'Control Systems Engineering',
      subtopics: [
        'Block Diagram Reduction, Signal Flow Graphs (Mason Gain Rule)',
        'Time-Domain Analysis: Transient & Steady State Response, Routh-Hurwitz',
        'Root Locus Techniques, Frequency Response: Bode Plots, Nyquist Stability',
        'Lead, Lag, Lead-Lag Compensators and PID Controllers',
        'State Space Analysis and Controllability/Observability',
      ],
    },
  ], 4),
  buildSubject('Communications', 'EC-COMM', [
    {
      name: 'Analog & Digital Communications',
      subtopics: [
        'Random Processes: Autocorrelation, Power Spectral Density, White Noise',
        'Analog Systems: AM, DSB-SC, SSB, VSB, FM, Phase Modulation, SNR Analysis',
        'Digital Baseband Transmission: PCM, DPCM, DM, Inter-Symbol Interference (ISI), Nyquist Criterion',
        'Digital Modulation: ASK, FSK, PSK, QAM, MAP and ML Decoders',
        'Information Theory: Entropy, Mutual Information, Channel Capacity, Huffman & Shannon-Fano Coding',
      ],
    },
  ], 5),
  buildSubject('Electromagnetics', 'EC-EM', [
    {
      name: 'Electromagnetics & Antennas',
      subtopics: [
        'Maxwell Equations, Uniform Plane Waves, Poynting Vector, Polarization',
        'Transmission Lines: Characteristic Impedance, Reflection Coefficient, Smith Chart',
        'Waveguides: Rectangular Waveguides, TE and TM Modes, Cutoff Frequencies',
        'Antennas: Dipole Antennas, Radiation Pattern, Directivity and Gain',
      ],
    },
  ], 6),
  buildSubject('General Aptitude', 'GA-EC', [
    {
      name: 'Verbal & Quantitative Aptitude',
      subtopics: ['English Grammar & Comprehension', 'Quantitative Ability', 'Analytical & Spatial Reasoning'],
    },
  ], 7),
];

// ----------------------------------------------------------------------
// 4. GATE EE - Electrical Engineering
// ----------------------------------------------------------------------
const SYLLABUS_EE: Subject[] = [
  buildSubject('Electric Circuits', 'EE-CIRC', [
    {
      name: 'Circuit Analysis & Theorems',
      subtopics: [
        'Network Graphs, KCL, KVL, Node and Mesh Analysis',
        'Thevenin, Norton, Superposition, Maximum Power Transfer, Reciprocity Theorems',
        'Transient Analysis of RLC Circuits (DC and AC Excitations)',
        'Three-Phase Circuits: Star-Delta, Power Measurement (2-Wattmeter Method)',
      ],
    },
  ], 0),
  buildSubject('Electromagnetic Fields', 'EE-EMF', [
    {
      name: 'Fields & Waves',
      subtopics: [
        'Coulomb Law, Electric Field Intensity, Gauss Law, Divergence',
        'Biot-Savart Law, Ampere Circuital Law, Faraday Law, Lorentz Force',
        'Inductance, Capacitance, Maxwell Equations, Skin Effect',
      ],
    },
  ], 1),
  buildSubject('Signals and Systems', 'EE-SS', [
    {
      name: 'Signals, Transforms & Systems',
      subtopics: [
        'Representation of Continuous and Discrete-time Signals',
        'LTI Systems, Convolution, Fourier Series, Fourier Transform',
        'Laplace Transform, Z-Transform, Sampling Theorem',
      ],
    },
  ], 2),
  buildSubject('Electrical Machines', 'EE-MACH', [
    {
      name: 'Transformers & Motors',
      subtopics: [
        'Single-phase and Three-phase Transformers: Equivalent Circuit, Phasing, Tests, Efficiency, Auto-transformer',
        'DC Machines: Armature Reaction, Commutation, Speed Control, Braking',
        'Three-phase Induction Motors: Torque-Speed Curve, Starting, Speed Control',
        'Synchronous Machines: Cylindrical and Salient Pole, Voltage Regulation, V and Inverted V Curves',
      ],
    },
  ], 3),
  buildSubject('Power Systems', 'EE-PS', [
    {
      name: 'Generation, Transmission & Protection',
      subtopics: [
        'Basic Power Generation Concepts, Transmission Line Models and Performance',
        'Corona, String Efficiency, Surge Impedance Loading',
        'Power Flow Analysis: Gauss-Seidel, Newton-Raphson Methods',
        'Symmetrical and Unsymmetrical Fault Analysis (Sequence Networks)',
        'System Stability: Equal Area Criterion, Swing Equation',
        'Relaying & Circuit Breakers: Differential, Distance, Overcurrent Relays',
      ],
    },
  ], 4),
  buildSubject('Control Systems', 'EE-CS', [
    {
      name: 'Feedback & Control',
      subtopics: [
        'Block Diagrams, Signal Flow Graphs, Time Domain Specifications, Routh-Hurwitz',
        'Root Locus, Bode Plots, Nyquist Stability Criterion, Phase/Gain Margins',
        'Compensators (Lead/Lag) & PID Controllers, State Space Modeling',
      ],
    },
  ], 5),
  buildSubject('Electrical & Electronic Measurements', 'EE-MEAS', [
    {
      name: 'Instruments & Measurement Bridges',
      subtopics: [
        'PMMC, Moving Iron, Electrodynamometer type meters',
        'AC Bridges for L, C and R Measurement',
        'Instrument Transformers (CT & PT), Digital Voltmeters and Frequency Meters',
      ],
    },
  ], 6),
  buildSubject('Power Electronics', 'EE-PE', [
    {
      name: 'Converters & Drives',
      subtopics: [
        'Thyristors, MOSFETs, IGBTs Characteristics & Triggering',
        'Phase Controlled Rectifiers (Single-Phase and Three-Phase)',
        'DC-DC Switched Mode Converters: Buck, Boost, Buck-Boost',
        'Voltage Source Inverters (Single-phase and Three-phase PWM)',
      ],
    },
  ], 7),
  buildSubject('Engineering Mathematics & GA', 'EE-MATH-GA', [
    {
      name: 'Math & General Aptitude',
      subtopics: [
        'Linear Algebra, Calculus, Differential Equations, Complex Variables, Probability',
        'Verbal, Quantitative & Analytical Aptitude',
      ],
    },
  ], 8),
];

// ----------------------------------------------------------------------
// 5. GATE ME - Mechanical Engineering
// ----------------------------------------------------------------------
const SYLLABUS_ME: Subject[] = [
  buildSubject('Engineering Mechanics & Strength of Materials', 'ME-EM-SOM', [
    {
      name: 'Engineering Mechanics',
      subtopics: [
        'Free-body Diagrams, Equilibrium, Trusses and Frames',
        'Friction, Rolling Resistance, Centroid and Moment of Inertia',
        'Kinematics and Kinetics of Particles and Rigid Bodies, Impulse-Momentum',
      ],
    },
    {
      name: 'Strength of Materials (SOM)',
      subtopics: [
        'Stress and Strain, Elastic Constants, Mohr Circle',
        'Shear Force and Bending Moment Diagrams',
        'Bending and Shear Stresses in Beams',
        'Torsion of Circular Shafts, Deflection of Beams',
        'Euler Columns, Thin & Thick Cylinders',
      ],
    },
  ], 0),
  buildSubject('Theory of Machines & Vibrations', 'ME-TOM-VIB', [
    {
      name: 'Theory of Machines (TOM)',
      subtopics: [
        'Displacement, Velocity and Acceleration Analysis of Plane Mechanisms',
        'Gears and Gear Trains, Cams and Followers',
        'Flywheels, Governors, Balancing of Reciprocating and Rotating Masses',
      ],
    },
    {
      name: 'Mechanical Vibrations',
      subtopics: [
        'Free and Forced Vibration of Single DOF Systems',
        'Damping: Viscous, Critical, Over & Under-damped Systems',
        'Resonance, Transmissibility, Vibration Isolation',
      ],
    },
  ], 1),
  buildSubject('Machine Design', 'ME-MD', [
    {
      name: 'Machine Elements Design',
      subtopics: [
        'Design for Static and Dynamic Loading (S-N Curve, Goodman, Soderberg)',
        'Design of Bolted, Riveted and Welded Joints',
        'Design of Shafts, Keys, Couplings, Clutches and Brakes',
        'Rolling and Sliding Contact Bearings Selection and Life Calculation',
      ],
    },
  ], 2),
  buildSubject('Fluid Mechanics & Hydraulic Machines', 'ME-FM', [
    {
      name: 'Fluid Mechanics',
      subtopics: [
        'Fluid Properties, Manometry, Hydrostatic Forces on Surfaces, Buoyancy',
        'Fluid Kinematics: Streamlines, Velocity Potential, Stream Function',
        'Bernoulli Equation, Momentum Equation, Pipe Flow, Darcy-Weisbach',
        'Boundary Layer Theory, Drag and Lift Forces',
        'Turbomachinery: Pelton, Francis, Kaplan Turbines and Centrifugal Pumps',
      ],
    },
  ], 3),
  buildSubject('Thermodynamics & Heat Transfer', 'ME-THERMO-HT', [
    {
      name: 'Applied Thermodynamics',
      subtopics: [
        'Zeroth, First and Second Laws of Thermodynamics, Entropy, Exergy',
        'Thermodynamic Cycles: Otto, Diesel, Dual, Rankine, Brayton, Vapor Compression',
        'Properties of Pure Substances, Psychrometry & Psychrometric Processes',
      ],
    },
    {
      name: 'Heat Transfer',
      subtopics: [
        'Conduction: 1D Steady State, Critical Insulation, Extended Surfaces (Fins)',
        'Convection: Free and Forced Convection, Dimensionless Numbers (Nu, Re, Pr, Gr)',
        'Radiation: Stefan-Boltzmann Law, Wien Law, Shape Factors, Radiation Shields',
        'Heat Exchangers: LMTD and NTU-Effectiveness Methods',
      ],
    },
  ], 4),
  buildSubject('Manufacturing & Industrial Engineering', 'ME-MFG-IE', [
    {
      name: 'Manufacturing Technology',
      subtopics: [
        'Casting: Patterns, Moulds, Gating Design, Solidification, Defects',
        'Forming: Rolling, Forging, Extrusion, Wire Drawing, Sheet Metal Operations',
        'Machining: Merchant Force Circle, Taylor Tool Life Equation, Economics of Machining',
        'Welding: Shielded Metal Arc, TIG, MIG, Resistance Welding, Defects',
        'Metrology & Inspection: Fits, Tolerances, CMM, Surface Finish',
      ],
    },
    {
      name: 'Industrial Engineering & Operations Research',
      subtopics: [
        'Forecasting Models, Aggregate Production Planning, MRP',
        'Inventory Control: EOQ Models, ABC Analysis',
        'Operations Research: Linear Programming (Simplex), Transportation, Assignment',
        'Project Management: PERT and CPM, Crashing',
      ],
    },
  ], 5),
  buildSubject('Engineering Mathematics & GA', 'ME-MATH-GA', [
    {
      name: 'Math & General Aptitude',
      subtopics: [
        'Linear Algebra, Calculus, Differential Equations, Vector Calculus, Probability',
        'General Aptitude: Verbal, Numerical and Spatial Ability',
      ],
    },
  ], 6),
];

// ----------------------------------------------------------------------
// 6. GATE CE - Civil Engineering
// ----------------------------------------------------------------------
const SYLLABUS_CE: Subject[] = [
  buildSubject('Structural Engineering', 'CE-STRUCT', [
    {
      name: 'Mechanics & Structures',
      subtopics: [
        'Bending Moment and Shear Force Diagrams, Stresses and Deflections in Beams',
        'Analysis of Statically Determinate and Indeterminate Structures',
        'Energy Methods, Slope-Deflection, Moment Distribution Methods',
        'Design of Reinforced Concrete Structures (Limit State Method: Beams, Slabs, Columns, Footings)',
        'Design of Steel Structures: Tension/Compression Members, Connections, Plastic Analysis',
      ],
    },
  ], 0),
  buildSubject('Geotechnical Engineering', 'CE-GEO', [
    {
      name: 'Soil Mechanics & Foundations',
      subtopics: [
        'Soil Classification, Phase Relations, Compaction and Permeability',
        'Effective Stress, Seepage, Consolidation and Settlement Analysis',
        'Shear Strength of Soils (Mohr-Coulomb, Direct Shear, Triaxial Test)',
        'Earth Pressure Theories (Rankine, Coulomb) and Retaining Walls',
        'Shallow & Deep Foundations: Bearing Capacity, Pile Foundations',
      ],
    },
  ], 1),
  buildSubject('Water Resources & Environmental Engineering', 'CE-WRE-ENV', [
    {
      name: 'Fluid Mechanics & Hydrology',
      subtopics: [
        'Fluid Statics, Kinematics, Dynamics, Pipe Flow, Open Channel Flow',
        'Hydrology: Hydrograph, Unit Hydrograph, Flood Routing, Ground Water',
        'Irrigation Engineering: Water Requirements of Crops, Gravity Dams, Spillways',
      ],
    },
    {
      name: 'Environmental Engineering',
      subtopics: [
        'Water Quality Parameters, Water Treatment Processes (Coagulation, Sedimentation, Filtration, Disinfection)',
        'Wastewater Treatment: BOD, COD, Activated Sludge Process, Trickling Filters',
        'Air Pollution & Noise Pollution: Standards and Control Methods',
      ],
    },
  ], 2),
  buildSubject('Transportation & Geomatics Engineering', 'CE-TRANS-GEO', [
    {
      name: 'Transportation & Surveying',
      subtopics: [
        'Geometric Design of Highways (Sight Distances, Horizontal & Vertical Curves)',
        'Pavement Design: Flexible and Rigid Pavements (IRC Standards)',
        'Traffic Engineering: Traffic Stream Parameters, Signal Design (Webster Method)',
        'Surveying: Principles, Levelling, Theodolite, Curves, GPS and Remote Sensing',
      ],
    },
  ], 3),
  buildSubject('Engineering Mathematics & GA', 'CE-MATH-GA', [
    {
      name: 'Math & Aptitude',
      subtopics: ['Linear Algebra, Calculus, Differential Equations, Probability', 'General Aptitude'],
    },
  ], 4),
];

// ----------------------------------------------------------------------
// 7. GATE IN - Instrumentation Engineering
// ----------------------------------------------------------------------
const SYLLABUS_IN: Subject[] = [
  buildSubject('Sensors and Industrial Instrumentation', 'IN-SENS', [
    {
      name: 'Sensors & Transducers',
      subtopics: [
        'Resistive, Capacitive, Inductive, Piezoelectric, Hall Effect Transducers',
        'Measurement of Temperature (RTD, Thermocouple, Thermistor, Pyrometer)',
        'Measurement of Pressure, Flow (Orifice, Venturi, Ultrasonic, Magnetic), Level and Viscosity',
      ],
    },
  ], 0),
  buildSubject('Analog & Digital Electronics', 'IN-ADE', [
    {
      name: 'Circuits & Systems',
      subtopics: [
        'Op-Amp Applications, Instrumentation Amplifiers, Active Filters',
        'Combinational and Sequential Logic Circuits, A/D and D/A Converters',
        'Microcontrollers and Embedded Systems Basics',
      ],
    },
  ], 1),
  buildSubject('Signals, Systems and Control', 'IN-SSC', [
    {
      name: 'Control & DSP',
      subtopics: [
        'Feedback Control, Stability, Root Locus, Bode & Nyquist Plots, Compensators, PID Tuning',
        'Continuous and Discrete-time Fourier Transforms, Z-Transform, Filter Design',
      ],
    },
  ], 2),
  buildSubject('Optics & Biomedical Instrumentation', 'IN-OPT-BIO', [
    {
      name: 'Optical & Biomedical',
      subtopics: [
        'Optical Sources and Detectors (LED, Laser, Photodiode), Optical Fibers',
        'Biomedical Signals: ECG, EEG, EMG and Safety Standards',
      ],
    },
  ], 3),
  buildSubject('Engineering Mathematics & GA', 'IN-MATH-GA', [
    {
      name: 'Math & General Aptitude',
      subtopics: ['Linear Algebra, Calculus, Differential Equations, Probability', 'Verbal and Numerical Aptitude'],
    },
  ], 4),
];

// ----------------------------------------------------------------------
// 8. GATE CH - Chemical Engineering
// ----------------------------------------------------------------------
const SYLLABUS_CH: Subject[] = [
  buildSubject('Process Calculations & Thermodynamics', 'CH-PC-THERMO', [
    {
      name: 'Mass & Energy Balances & Thermo',
      subtopics: [
        'Steady and Unsteady State Mass and Energy Balances, Recycle, Bypass and Purge',
        'First and Second Laws of Thermodynamics, PVT Behavior of Pure Fluids, Fugacity, Activity Coefficients',
        'Phase Equilibria (VLE, LLE), Chemical Reaction Equilibria',
      ],
    },
  ], 0),
  buildSubject('Fluid Mechanics & Mechanical Operations', 'CH-FM-MO', [
    {
      name: 'Fluid Flow & Particle Technology',
      subtopics: [
        'Fluid Statics, Continuity and Navier-Stokes Equations, Bernoulli Equation',
        'Flow through Pipes and Packed Beds, Fluidization, Pumps and Compressors',
        'Particle Size Analysis, Filtration, Settling, Size Reduction',
      ],
    },
  ], 1),
  buildSubject('Heat and Mass Transfer', 'CH-HT-MT', [
    {
      name: 'Transport Phenomena',
      subtopics: [
        'Conduction, Convection, Radiation, Heat Exchanger Design (LMTD, NTU), Evaporators',
        'Fick Law, Mass Transfer Coefficients, Distillation (McCabe-Thiele), Absorption, Extraction, Drying',
      ],
    },
  ], 2),
  buildSubject('Chemical Reaction Engineering & Plant Design', 'CH-CRE-PD', [
    {
      name: 'Kinetics, Reactors & Economics',
      subtopics: [
        'Kinetics of Homogeneous Reactions, Batch, CSTR and PFR Design',
        'Reactor Combinations, Non-ideal Flow (RTD), Catalytic Reactions',
        'Process Instrumentation and Control, Capital Cost Estimation, Economics',
      ],
    },
  ], 3),
  buildSubject('Engineering Mathematics & GA', 'CH-MATH-GA', [
    {
      name: 'Math & Aptitude',
      subtopics: ['Linear Algebra, Calculus, Differential Equations, Numerical Methods', 'General Aptitude'],
    },
  ], 4),
];

// ----------------------------------------------------------------------
// 9. GATE PI - Production & Industrial Engineering
// ----------------------------------------------------------------------
const SYLLABUS_PI: Subject[] = [
  buildSubject('Manufacturing Processes', 'PI-MFG', [
    {
      name: 'Processes & Metrology',
      subtopics: [
        'Casting, Metal Forming, Sheet Metal Operations, Joining/Welding',
        'Machining and Machine Tool Operations, Non-traditional Machining (EDM, ECM, USM, LBM)',
        'Metrology, Limits, Fits and Tolerances, Surface Roughness Measurement',
      ],
    },
  ], 0),
  buildSubject('Industrial Engineering & Operations Research', 'PI-IE-OR', [
    {
      name: 'Operations Research & Production Management',
      subtopics: [
        'Linear Programming, Transportation, Assignment, Queuing Theory, Dynamic Programming',
        'Forecasting, Aggregate Planning, MRP, ERP, JIT, Lean Manufacturing',
        'Inventory Control Models (Deterministic and Probabilistic)',
        'Quality Control: Statistical Process Control, Control Charts, Acceptance Sampling, Six Sigma',
      ],
    },
  ], 1),
  buildSubject('Engineering Mathematics & GA', 'PI-MATH-GA', [
    {
      name: 'Math & Aptitude',
      subtopics: ['Linear Algebra, Calculus, Differential Equations, Probability & Statistics', 'General Aptitude'],
    },
  ], 2),
];

// Map of standard branches to syllabi
export const BRANCH_SYLLABI: Record<GateBranch, Subject[]> = {
  CS: SYLLABUS_CS,
  DA: SYLLABUS_DA,
  EC: SYLLABUS_EC,
  EE: SYLLABUS_EE,
  ME: SYLLABUS_ME,
  CE: SYLLABUS_CE,
  IN: SYLLABUS_IN,
  CH: SYLLABUS_CH,
  PI: SYLLABUS_PI,
  CUSTOM: [],
};

/**
 * Gets a fresh clone of syllabus for branch to avoid mutating base objects
 */
export function getFreshSyllabusForBranch(branch: GateBranch): Subject[] {
  const base = BRANCH_SYLLABI[branch] || [];
  return JSON.parse(JSON.stringify(base));
}
